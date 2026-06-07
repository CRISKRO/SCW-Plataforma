import requests
import json

def test_upload():
    url = "http://localhost:8000/api/gallery/images/"
    # We need a token, let's first login
    # Wait, instead of logging in, I can just check the backend logs.
