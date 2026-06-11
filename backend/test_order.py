import requests
import json

url = "http://localhost:8000/api/payments/create-order/"
payload = {
    "contact_email": "test@test.com",
    "contact_phone": "1234567890",
    "items": json.dumps([{"product_id": 999123, "name": "Boleto", "price": 100, "quantity": 1}]),
    "payment_method": "MERCADOPAGO"
}

files = {}
response = requests.post(url, data=payload, files=files)
print(response.status_code)
print(response.text)
