import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import EmailMultiAlternatives
from email.mime.image import MIMEImage

email = EmailMultiAlternatives('Subj', 'Text', 'a@b.com', ['c@d.com'])
email.mixed_subtype = 'related'
email.attach_alternative('<html><body><img src="cid:123"><img src="cid:456"></body></html>', 'text/html')

img1 = MIMEImage(b'123', _subtype='png')
img1.add_header('Content-ID', '<123>')
img1.add_header('Content-Disposition', 'inline', filename='123.png')
email.attach(img1)

img2 = MIMEImage(b'456', _subtype='png')
img2.add_header('Content-ID', '<456>')
img2.add_header('Content-Disposition', 'inline', filename='456.png')
email.attach(img2)

print(email.message().as_string())
