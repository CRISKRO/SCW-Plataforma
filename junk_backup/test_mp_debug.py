import mercadopago

ACCESS_TOKEN = "APP_USR-4567819079219780-052016-961644763cb3c78d3e0395f8ac34697d-1514659676"
mp = mercadopago.SDK(ACCESS_TOKEN)

pref = mp.preference().create({
    "items": [{"title": "Camiseta SCW", "quantity": 1, "unit_price": 450.0, "currency_id": "MXN"}],
    "payer": {"email": "ochoachristian294@gmail.com"},
    "back_urls": {
        "success": "http://localhost:3000/carrito/success",
        "failure": "http://localhost:3000/carrito",
        "pending": "http://localhost:3000/carrito"
    },
})
resp = pref.get("response", {})
print("HTTP Status:", pref.get("status"))
print("init_point:", resp.get("init_point", "VACÍO"))
print("Error:", resp.get("message", "none"))
