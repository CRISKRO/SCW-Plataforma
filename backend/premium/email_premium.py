from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from api.models import get_active_config

def send_premium_activation_email(subscription):
    user = subscription.user
    if not user or not user.email:
        return
        
    config = get_active_config()
    subject = "¡Bienvenido a SCW Premium VIP! 🌟"
    
    context = {
        'name': user.first_name or 'Aficionado',
        'end_date': subscription.end_date.strftime('%d/%m/%Y'),
        'plan_name': subscription.plan.name
    }
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #e50914; padding: 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">¡Bienvenido a SCW Premium!</h1>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #ccc;">Hola <strong>{context['name']}</strong>,</p>
            <p style="font-size: 16px; color: #ccc;">¡Tu suscripción <strong>{context['plan_name']}</strong> ha sido activada con éxito!</p>
            
            <div style="background-color: #222; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333;">
                <p style="margin: 0 0 10px 0; color: #aaa; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Detalles de la Membresía</p>
                <p style="margin: 5px 0; font-size: 18px; color: white;">Válida hasta: <strong>{context['end_date']}</strong></p>
            </div>
            
            <p style="font-size: 16px; color: #ccc;">Ya tienes acceso total a todo nuestro catálogo VOD, eventos en vivo y contenido exclusivo. Ve a la plataforma y disfruta de la mejor lucha libre.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://scw-plataforma.vercel.app/premium" style="display: inline-block; background-color: #e50914; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Ver Contenido Premium</a>
            </div>
        </div>
        <div style="background-color: #000; padding: 20px; text-align: center; border-top: 1px solid #222;">
            <p style="margin: 0; color: #666; font-size: 12px;">SCW - SCW DOJO<br>Este es un correo automático, por favor no respondas.</p>
        </div>
    </div>
    """
    
    text_content = strip_tags(html_content)
    
    email_host_user = config.email_host_user
    default_from_email = config.default_from_email or 'boletos.scw@gmail.com'
    
    if not email_host_user:
        print("Error: SMTP User not configured. Cannot send email.")
        return
        
    try:
        from django.core.mail import get_connection
        connection = get_connection(
            host=config.email_host,
            port=config.email_port,
            username=config.email_host_user,
            password=config.email_host_password,
            use_tls=config.email_use_tls
        )
        
        import re
        match = re.search(r'<([^>]+)>', default_from_email)
        from_email_clean = match.group(1).strip() if match else default_from_email.strip()

        msg = EmailMultiAlternatives(
            subject,
            text_content,
            from_email_clean,
            [user.email],
            connection=connection
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Premium activation email sent to {user.email}")
    except Exception as e:
        print(f"Failed to send premium email to {user.email}: {str(e)}")
