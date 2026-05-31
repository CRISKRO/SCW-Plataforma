from rest_framework import serializers, viewsets, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Enrollment
from datetime import date, timedelta
import requests
import os
import logging
from api.models import get_active_config

logger = logging.getLogger(__name__)

class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = '__all__'

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser()]

    def list(self, request, *args, **kwargs):
        # Recalcular dinámicamente los estados de pago de todos los alumnos activos al listarlos
        approved_students = Enrollment.objects.filter(status='APPROVED')
        for student in approved_students:
            student.update_dynamic_payment_status()
        return super().list(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = self.get_object()
        original_status = instance.status
        updated_instance = serializer.save()
        
        if original_status != 'APPROVED' and updated_instance.status == 'APPROVED':
            self.send_admission_whatsapp(updated_instance)

    def send_admission_whatsapp(self, enrollment):
        try:
            config = get_active_config()
            if not config.whatsapp_enabled:
                return
            whatsapp_url = config.whatsapp_service_url if config.whatsapp_service_url else 'http://localhost:3001'
        except Exception as e:
            logger.error(f"Error al obtener la configuración activa (¿falta migrar?): {e}")
            return
        phone = enrollment.phone
        
        message = (
            f"🎉 *¡SCW Dojo — Felicitaciones, has sido Admitido!* 🥊\n\n"
            f"¡Hola *{enrollment.name}*!\n\n"
            f"Nos complace informarte que tu solicitud de inscripción al SCW Dojo ha sido **APROBADA** por la administración. ¡Ya eres parte oficial del equipo! 🥊⚡\n\n"
            f"📍 *Nivel de Experiencia:* {enrollment.get_experience_display()}\n\n"
            f"Te esperamos en tu primera sesión de entrenamiento. ¡Prepárate para darlo todo en el ring! ⚡🥊\n\n"
            f"Si tienes alguna duda sobre los horarios, uniformes o mensualidades, no dudes en escribirnos por este medio."
        )
        
        try:
            res = requests.post(
                f"{whatsapp_url}/send-message",
                json={'phone': phone, 'message': message},
                timeout=8
            )
            if res.status_code != 200:
                logger.error(f"Error al enviar mensaje de admisión por WhatsApp: {res.text}")
        except Exception as e:
            logger.error(f"Error de conexión con el servicio de WhatsApp al enviar admisión: {e}")

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def register_payment(self, request, pk=None):
        enrollment = self.get_object()
        if enrollment.status != 'APPROVED':
            return Response(
                {"error": "Solo se pueden registrar pagos para alumnos confirmados."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        today = date.today()
        enrollment.last_payment_date = today
        enrollment.payment_due_date = today + timedelta(days=30)
        enrollment.payment_status = 'PAID'
        enrollment.save()

        # Enviar confirmación por WhatsApp
        config = get_active_config()
        whatsapp_url = config.whatsapp_service_url if config.whatsapp_service_url else 'http://localhost:3001'
        phone = enrollment.phone
        due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')
        last_payment_str = enrollment.last_payment_date.strftime('%d/%m/%Y')
        
        message = (
            f"🥊 *SCW Dojo — Confirmación de Mensualidad*\n\n"
            f"¡Hola *{enrollment.name}*!\n\n"
            f"Te confirmamos que hemos registrado con éxito el pago de tu mensualidad el día *{last_payment_str}*.\n\n"
            f"📅 *Próximo Vencimiento:* {due_date_str}\n\n"
            f"¡Muchas gracias por seguir entrenando en el SCW Dojo! ¡A seguir dándolo todo en el ring! 🥊⚡"
        )

        whatsapp_sent = False
        if config.whatsapp_enabled:
            try:
                res = requests.post(
                    f"{whatsapp_url}/send-message",
                    json={'phone': phone, 'message': message},
                    timeout=8
                )
                if res.status_code == 200:
                    whatsapp_sent = True
                else:
                    logger.error(f"Error al enviar mensaje por WhatsApp: {res.text}")
            except Exception as e:
                logger.error(f"Error de conexión con el servicio de WhatsApp: {e}")

        return Response({
            "success": True,
            "message": "Pago registrado con éxito.",
            "whatsapp_sent": whatsapp_sent,
            "data": EnrollmentSerializer(enrollment).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def send_payment_reminder(self, request, pk=None):
        enrollment = self.get_object()
        if enrollment.status != 'APPROVED':
            return Response(
                {"error": "Solo se pueden enviar recordatorios a alumnos confirmados."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not enrollment.payment_due_date:
            return Response(
                {"error": "El alumno no tiene una fecha de vencimiento registrada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Recalcular el estado dinámicamente antes de enviar
        enrollment.update_dynamic_payment_status()

        config = get_active_config()
        whatsapp_url = config.whatsapp_service_url if config.whatsapp_service_url else 'http://localhost:3001'
        phone = enrollment.phone
        due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')

        if enrollment.payment_status == 'UNPAID':
            message = (
                f"🚨 *SCW Dojo — Recordatorio de Pago Vencido*\n\n"
                f"¡Hola *{enrollment.name}*!\n\n"
                f"Te recordamos que el pago de tu mensualidad del Dojo se encuentra *VENCIDO* desde el día *{due_date_str}*.\n\n"
                f"Para mantener tu lugar activo en los entrenamientos, te pedimos realizar tu pago a la brevedad.\n\n"
                f"¡Te esperamos en el entrenamiento! ¡A seguir preparándote! 🥊"
            )
        else:
            message = (
                f"⏰ *SCW Dojo — Recordatorio de Mensualidad Próxima a Vencer*\n\n"
                f"¡Hola *{enrollment.name}*!\n\n"
                f"Te recordamos de manera atenta que tu mensualidad del Dojo está próxima a vencer.\n\n"
                f"📅 *Fecha Límite:* {due_date_str}\n\n"
                f"Por favor tómalo en cuenta para realizar tu pago a tiempo y no perder ritmo.\n\n"
                f"¡Nos vemos en el entrenamiento! 🥊⚡"
            )

        whatsapp_sent = False
        if config.whatsapp_enabled:
            try:
                res = requests.post(
                    f"{whatsapp_url}/send-message",
                    json={'phone': phone, 'message': message},
                    timeout=8
                )
                if res.status_code == 200:
                    whatsapp_sent = True
                else:
                    logger.error(f"Error al enviar recordatorio por WhatsApp: {res.text}")
            except Exception as e:
                logger.error(f"Error de conexión con el servicio de WhatsApp: {e}")

        return Response({
            "success": True,
            "whatsapp_sent": whatsapp_sent,
            "message": "Recordatorio enviado con éxito." if whatsapp_sent else ("No se pudo enviar el mensaje por WhatsApp. ¿Está el microservicio encendido?" if config.whatsapp_enabled else "Las notificaciones de WhatsApp están desactivadas en la configuración.")
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def status(self, request):
        """Returns the enrollment status for the current user (PENDING or APPROVED)."""
        enrollment = Enrollment.objects.filter(email=request.user.email).first()
        if not enrollment:
            return Response({"status": "NONE"}, status=status.HTTP_200_OK)
        return Response({
            "status": enrollment.status,
            "enrollment": EnrollmentSerializer(enrollment).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my(self, request):
        """Returns the approved enrollment for the current user."""
        enrollment = Enrollment.objects.filter(email=request.user.email, status='APPROVED').first()
        if not enrollment:
            return Response({"error": "No eres un alumno activo."}, status=status.HTTP_404_NOT_FOUND)
        
        enrollment.update_dynamic_payment_status()
        
        config = get_active_config()
        return Response({
            "enrollment": EnrollmentSerializer(enrollment).data,
            "tuition_fee": str(config.tuition_fee)
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def pay_tuition(self, request, pk=None):
        """Generates a MercadoPago preference to pay the monthly tuition."""
        enrollment = self.get_object()
        
        if enrollment.email != request.user.email and not request.user.is_staff:
            return Response({"error": "No puedes pagar la colegiatura de otro alumno."}, status=status.HTTP_403_FORBIDDEN)
            
        if enrollment.status != 'APPROVED':
            return Response({"error": "Solo alumnos confirmados pueden pagar colegiatura."}, status=status.HTTP_400_BAD_REQUEST)
            
        config = get_active_config()
        tuition_fee = float(config.tuition_fee)
        commission = float(config.mercadopago_commission_rate)
        price_with_commission = round(tuition_fee * (1 + commission), 2)
        
        try:
            import mercadopago
            from django.conf import settings
            access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
            mp = mercadopago.SDK(access_token)
            
            frontend_url = request.headers.get('origin', 'http://localhost:3000')
            backend_url = f"{request.scheme}://{request.get_host()}"
            
            preference_data = {
                "items": [
                    {
                        "title": f"Mensualidad SCW Dojo - {enrollment.name}",
                        "quantity": 1,
                        "currency_id": "MXN",
                        "unit_price": price_with_commission
                    }
                ],
                "payer": {
                    "email": request.user.email
                },
                "back_urls": {
                    "success": f"{frontend_url}/dashboard?tuition=success",
                    "failure": f"{frontend_url}/dashboard?tuition=failure",
                    "pending": f"{frontend_url}/dashboard?tuition=pending"
                },
                "auto_return": "approved",
                "notification_url": f"{backend_url}/api/payments/webhook/",
                "external_reference": f"TUITION_{enrollment.id}"
            }
            
            preference_response = mp.preference().create(preference_data)
            preference = preference_response.get("response", {})
            
            is_test = access_token.startswith("TEST-")
            init_point = preference.get("sandbox_init_point") if is_test else preference.get("init_point")
            if not init_point:
                init_point = preference.get("init_point", "")
                
            return Response({
                "init_point": init_point,
                "preference_id": preference.get("id", "")
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generando preferencia MP para colegiatura: {e}")
            return Response({"error": f"No se pudo conectar con MercadoPago: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
