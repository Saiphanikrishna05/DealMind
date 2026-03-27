import requests
import json
import sys

def test_stream():
    url = "http://localhost:8000/v1/analyze/stream"
    payload = {"company_name": "AAPL", "agent_type": "financial_analyst"}
    try:
        response = requests.post(url, json=payload, stream=True)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(decoded_line)
                if "error" in decoded_line.lower():
                    print("\n[!] ERROR DETECTED IN STREAM [!]")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_stream()
