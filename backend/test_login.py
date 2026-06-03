from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.create_user(email="test3@example.com", password="pwd", first_name="A", last_name="B")
print("User active?", u.is_active)
