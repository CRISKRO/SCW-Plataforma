from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from api.models import get_active_config
from .models import SubscriptionPlan, PremiumVideo, UserSubscription
from .serializers import SubscriptionPlanSerializer, PremiumVideoSerializer
from django.utils import timezone
from datetime import timedelta

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN'])

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAdminOrReadOnly]

class IsPremiumOrAdmin(BasePermission):
    """Admins can write; authenticated premium users can read."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True  # Any authenticated user can read (queryset filters below)
        return request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN']

class PremiumVideoViewSet(viewsets.ModelViewSet):
    serializer_class = PremiumVideoSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsPremiumOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        # Admins see all videos
        if user and user.is_authenticated and (user.is_staff or getattr(user, 'role', None) in ['ADMIN', 'SUPERADMIN']):
            return PremiumVideo.objects.all().order_by('-release_date')
        
        # Everyone else (including unauthenticated) sees published videos only
        return PremiumVideo.objects.filter(is_published=True).order_by('-release_date')

class SubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # In a real app, this would verify a MercadoPago/Stripe payment token.
        # For this simulator, we just grant the subscription.
        
        import mercadopago
        from django.conf import settings
        
        plan, _ = SubscriptionPlan.objects.get_or_create(
            name="Membresía Mensual VIP",
            defaults={"description": "Acceso total al catálogo VOD y en vivo", "price": 199.00, "duration_days": 30}
        )
        
        # Deactivate any existing active subscriptions to avoid overlap
        UserSubscription.objects.filter(user=user, is_active=True).update(is_active=False)
        
        # Create new subscription as PENDING (starts inactive)
        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            end_date=timezone.now() + timedelta(days=plan.duration_days),
            is_active=False
        )
        
        try:
            config = get_active_config()
            access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
            mp = mercadopago.SDK(access_token)
            frontend_url = request.headers.get('origin', 'http://localhost:3000')
            backend_url = f"{request.scheme}://{request.get_host()}"
            
            preference_data = {
                "items": [
                    {
                        "title": "Suscripción Premium VIP SCW (30 Días)",
                        "quantity": 1,
                        "currency_id": "MXN",
                        "unit_price": float(plan.price)
                    }
                ],
                "payer": {
                    "email": request.user.email
                },
                "back_urls": {
                    "success": f"{frontend_url}/premium",
                    "failure": f"{frontend_url}/premium/checkout",
                    "pending": f"{frontend_url}/premium"
                },
                "auto_return": "approved",
                "notification_url": f"{backend_url}/api/payments/webhook/",
                "external_reference": f"SUB_{subscription.id}"
            }
            
            preference_response = mp.preference().create(preference_data)
            preference = preference_response.get("response", {})
            init_point = preference.get("init_point", "")

            return Response({
                "status": "success",
                "message": "Suscripción creada. Redirigiendo a Mercado Pago.",
                "end_date": subscription.end_date,
                "init_point": init_point
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print("Error con Mercado Pago:", e)
            return Response({"error": "Error de pasarela de pagos"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription = UserSubscription.objects.filter(user=request.user, is_active=True).first()
        
        if subscription:
            return Response({
                "is_active": True,
                "plan_name": subscription.plan.name,
                "end_date": subscription.end_date
            })
        elif getattr(request.user, 'role', None) in ['PREMIUM', 'ADMIN', 'SUPERADMIN']:
            # The user has the role but no active UserSubscription object (perhaps granted manually by admin)
            return Response({
                "is_active": True,
                "plan_name": "Membresía (Otorgada Manualmente)",
                "end_date": None
            })
            
        return Response({"is_active": False})

class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subscriptions = UserSubscription.objects.filter(user=request.user, is_active=True)
        
        if subscriptions.exists():
            for sub in subscriptions:
                sub.is_active = False
                sub.save()
                
            user = request.user
            if getattr(user, 'role', None) == 'PREMIUM':
                user.role = 'USER'
                user.save()
                
            return Response({"message": "Suscripción cancelada exitosamente."})
        elif getattr(request.user, 'role', None) == 'PREMIUM':
            # They have the role but no active subscription object
            user = request.user
            user.role = 'USER'
            user.save()
            return Response({"message": "Suscripción cancelada exitosamente (Rol removido)."})
            
        return Response({"error": "No tienes una suscripción activa."}, status=status.HTTP_404_NOT_FOUND)

