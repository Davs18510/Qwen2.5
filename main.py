import requests

url = "http://localhost:11434/api/chat"
while True:
    pergunta = input("Digite um prompt: ")
    if pergunta != "pare":   
        data = {
            "model": "qwen2.5:0.5b",
            "messages": [
                {"role": "user", "content": pergunta}
            ],
            "stream": False
        }

        response = requests.post(url, json=data)

        print(response.json()["message"]["content"])
    else:
        break
