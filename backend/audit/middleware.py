from .services import audit_api_request


class AuditActivityMiddleware:
    """Registra modificaciones de API después de ejecutar la vista.

    Las fallas del registro no deben interrumpir la compra.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        audit_api_request(request, response)
        return response
