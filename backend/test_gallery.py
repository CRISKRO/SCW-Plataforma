import requests
import json
import os
import sys

def test_api(): 
    # Attempt to hit the endpoint locally to see if it responds with 401 or 404
    url = "http://localhost:8000/api/gallery/images/"
    try:
        response = requests.get(url)
        print(f"GET {url} Status: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Error connecting to local server: {e}")
        return

if __name__ == "__main__":
    test_api()
