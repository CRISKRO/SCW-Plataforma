import requests

payload = {
    "contact_email": "test@test.com",
    "contact_phone": "",
    "items": [
        {"product_id": 9991, "name": "Boleto VIP", "price": "1500.00", "quantity": 1, "size": "Zona VIP - Fila A - Asiento 1"}
    ]
}

res = requests.post('http://localhost:8000/api/payments/create-order/', json=payload)
print(res.status_code)
print(res.text)
print(len(res.text))
