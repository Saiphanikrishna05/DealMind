import os
from dotenv import load_dotenv
import litellm

load_dotenv()
models = ["groq/llama-3.1-8b-instant", "groq/llama3-8b-8192", "groq/gemma2-9b-it", "groq/llama-3.3-70b-versatile"]
for m in models:
    try:
        res = litellm.completion(model=m, messages=[{"role":"user","content":"hi"}], max_tokens=10)
        print(f"✅ {m}: SUCCESS")
    except Exception as e:
        print(f"❌ {m}: FAILED ({str(e)})")
