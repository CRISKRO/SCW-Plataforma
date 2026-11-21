# Auditoría SCW

## Alcance
- Las visitas de páginas se registran en el frontend cuando el navegador ejecuta JavaScript.
- Las operaciones POST/PUT/PATCH/DELETE del backend registran fecha, ruta, resultado y usuario autenticado cuando corresponde.
- Los bloqueos y liberaciones de asientos incluyen IDs de asiento, evento y día.
- Las creaciones de pedido incluyen ID de orden cuando el endpoint lo devuelve.
- Se registran accesos exitosos por contraseña y Google. Los intentos fallidos se clasifican sin asociarlos a un usuario no verificado.
- No se recupera actividad anterior a la activación. No se prometen todas las interacciones (por ejemplo, movimiento del mouse, scroll y clics puramente locales).

## Seguridad
- GET /api/audit/logs/ exige `is_superuser=True` del backend y usuario autenticado.
- No se guardan cuerpos de petición, parámetros de consulta, cookies, contraseñas, tarjetas, comprobantes ni tokens.
- Visitantes no autenticados se muestran como anónimos con identificador de sesión aleatorio; un hash de origen técnico no es prueba de identidad.
- La creación del registro es tolerante a fallos para no bloquear pagos ni webhooks.

## Activación
1. Aplicar `python manage.py migrate` antes de cargar el frontend.
2. Validar `python manage.py check` y `python manage.py test audit tickets payments`.
3. Recargar la aplicación WSGI de PythonAnywhere.
4. Desplegar el frontend y verificar `/admin/auditoria` con una cuenta superusuario real.
5. Actualizar el aviso de privacidad para describir el registro de actividad y definir su período de retención.

## Mantenimiento
El borrado histórico es **manual** y no se ejecuta automáticamente:
`python manage.py prune_audit --days 180 --dry-run` para inspeccionar y
`python manage.py prune_audit --days 180` para eliminar registros aprobados.
