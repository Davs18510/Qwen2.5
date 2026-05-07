import requests

url = "http://localhost:11434/api/chat"

data = {
    "model": "qwen2.5:0.5b",
    "messages": [
        {"role": "user", "content": "Quem foi adolf hitler"}
    ],
    "stream": False
}

response = requests.post(url, json=data)

print(response.json()["message"]["content"])