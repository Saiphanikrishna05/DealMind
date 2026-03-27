import os
from google import genai

try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    for m in client.models.list():
        if "flash" in m.name:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
