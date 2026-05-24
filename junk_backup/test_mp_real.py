import requests
import json

payload = {
    "contact_email": "ochoachristian294@gmail.com",
    "contact_phone": "",
    "items": [
        {"product_id": 1, "name": "Camiseta SCW", "price": "450.00", "quantity": 1, "size": "M"}
    ]
}

res = requests.post('http://localhost:8000/api/payments/create-order/', json=payload)
print("Status:", res.status_code)
data = res.json()
print("init_point:", data.get('init_point', 'EMPTY'))
print("order_id:", data.get('order_id'))
