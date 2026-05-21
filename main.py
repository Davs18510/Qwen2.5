import ollama

while True:
    pergunta = input("Digite um prompt (ou 'pare' para sair): ")
    
    # Se digitar "pare", o loop é encerrado
    if pergunta.lower() == "pare":
        break

    # Montamos a estrutura com a instrução do sistema e a pergunta do usuário
    mensagens = [
        {
            "role": "system",
            "content": "Seu nome é joão"
        },
        {
            "role": "user",
            "content": pergunta
        }
    ]

    # A função ollama.chat faz o trabalho pesado de se comunicar com o servidor
    resposta = ollama.chat(model="qwen2.5:0.5b", messages=mensagens)

    # A biblioteca retorna um dicionário. Acessamos a mensagem gerada assim:
    print(resposta["message"]["content"])