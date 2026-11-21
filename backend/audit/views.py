import hashlib
import math
import uuid
from datetime import datetime, time, timedelta

from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog
from .services import record_event


class IsRealSuperuser(BasePermission):
    message = "Esta información es exclusiva del superusuario."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active and user.is_superuser
        )


class TrackPageView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        path = request.data.get("path")
        visitor_id = request.data.get("visitor_id")
        if (not isinstance(path, str) or not 1 <= len(path) <= 255
                or not path.startswith("/") or path.startswith("//")
                or "?" in path or "#" in path or "\x00" in path):
            return Response({"error": "Ruta inválida."}, status=400)
        try:
            parsed = uuid.UUID(str(visitor_id))
            if str(parsed) != str(visitor_id).lower():
                raise ValueError("UUID inválido")
        except (ValueError, AttributeError, TypeError):
            return Response({"error": "Identificador de visita inválido."}, status=400)

        # Evitar contar repetidas veces una misma página por recargas y sondeos.
        key = hashlib.sha256(f"{visitor_id}:{path}".encode()).hexdigest()
        if not cache.add(f"scw:audit:page:{key}", 1, timeout=20):
            return Response({"registered": False}, status=200)

        entry = record_event(
            request=request, category="NAVEGACION", action="VISITA_PAGINA",
            method="VIEW", path=path, visitor_id=str(parsed),
            status_code=200, details={"origen": "navegador"},
        )
        if entry is None:
            return Response({"error": "Registro de navegación no disponible."}, status=503)
        return Response({"registered": True}, status=201)


class AuditLogList(APIView):
    permission_classes = [IsAuthenticated, IsRealSuperuser]

    def get(self, request):
        queryset = AuditLog.objects.select_related("actor").all()

        category = str(request.query_params.get("category", "")).strip()[:32]
        action = str(request.query_params.get("action", "")).strip()[:64]
        query = str(request.query_params.get("q", "")).strip()[:120]
        from_date = str(request.query_params.get("from", ""))[:10]
        to_date = str(request.query_params.get("to", ""))[:10]
        if category:
            queryset = queryset.filter(category=category)
        if action:
            queryset = queryset.filter(action=action)
        if query:
            queryset = queryset.filter(
                Q(actor_label__icontains=query) |
                Q(action__icontains=query) |
                Q(path__icontains=query) |
                Q(resource_id__icontains=query) |
                Q(visitor_id__icontains=query)
            )
        if from_date:
            day = parse_date(from_date)
            if day:
                queryset = queryset.filter(
                    created_at__gte=timezone.make_aware(datetime.combine(day, time.min))
                )
        if to_date:
            day = parse_date(to_date)
            if day:
                queryset = queryset.filter(
                    created_at__lt=timezone.make_aware(datetime.combine(day + timedelta(days=1), time.min))
                )
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 40))))
        except (ValueError, TypeError):
            return Response({"error": "Paginación inválida."}, status=400)

        total = queryset.count()
        page_count = max(1, math.ceil(total / page_size))
        page = min(page, page_count)
        offset = (page - 1) * page_size
        records = queryset[offset:offset + page_size]
        results = [{
            "id": log.id,
            "created_at": log.created_at.isoformat(),
            "category": log.category,
            "action": log.action,
            "actor": {
                "id": log.actor_id,
                "label": log.actor_label or "Visitante sin iniciar sesión",
            },
            "visitor_id": log.visitor_id,
            "source_hash": log.source_hash,
            "method": log.method,
            "path": log.path,
            "resource_id": log.resource_id,
            "status_code": log.status_code,
            "details": log.details,
        } for log in records]

        return Response({
            "total": total, "page": page, "page_size": page_size,
            "pages": page_count, "results": results,
        })
