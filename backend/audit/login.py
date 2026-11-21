from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView

from .services import record_event


class AuditedTokenObtainPairView(TokenObtainPairView):
    """Identificar al actor sólo después de un inicio de sesión exitoso."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        user = None
        if response.status_code == 200:
            email = request.data.get("email", "")
            if isinstance(email, str) and len(email) <= 254:
                user = get_user_model().objects.filter(email__iexact=email).first()

        record_event(
            request=request, actor=user, category="ACCESOS",
            action="INICIO_SESION" if response.status_code == 200 else "LOGIN_RECHAZADO",
            method="POST", path="/api/auth/login/",
            status_code=response.status_code,
            details={"resultado": "aceptado" if response.status_code == 200 else "rechazado"},
        )
        return response
