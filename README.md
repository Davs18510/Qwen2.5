# JoãoGPT - Clone do ChatGPT com Backend Python & Ollama Local

Este projeto é uma réplica moderna e de alta fidelidade visual do ChatGPT. Ele pode ser executado **localmente** utilizando um backend Flask em Python conectado a um modelo local `qwen2.5:0.5b` no Ollama, ou hospedado de forma **estática no GitHub Pages**!

---

## 🎨 Funcionalidades Premium

* **Efeito de Digitação Fluida (Streaming):** Suporta respostas contínuas em tempo real.
* **Histórico de Conversas Persistente:** Criação, exclusão e alteração de títulos de conversas guardadas localmente no navegador (`localStorage`).
* **Visualização de Códigos Realçada:** Códigos gerados recebem realce de sintaxe profissional (Prism.js) e botão de "Copiar Código".
* **Instrução de Personalidade Customizável:** Altere a diretriz inicial ("Seu nome é joão") diretamente pelo painel de Configurações.
* **Seletor de API Dinâmico:** Alterne entre usar o Servidor Flask, chamar o Ollama Local diretamente no navegador, ou um endpoint de nuvem.
* **Responsividade Completa:** Visual adaptável e fluído para desktop, tablets e celulares.

---

## 🚀 Como Executar Localmente (Modo Recomendado)

### 1. Iniciar o Backend Flask
O backend Flask serve os arquivos estáticos e funciona como uma ponte (bridge) segura e sem bloqueios de CORS com o seu Ollama local.

1. Abra um terminal do PowerShell no diretório do projeto.
2. Ative o ambiente virtual:
   ```powershell
   .\venv\Scripts\activate
   ```
3. Execute o servidor:
   ```powershell
   python app.py
   ```
4. Acesse **[http://localhost:5000](http://localhost:5000)** no seu navegador.

---

## 🌐 Como Publicar no GitHub Pages

Para publicar este site gratuitamente no **GitHub Pages**, siga os passos abaixo:

### Passo 1: Inicializar e enviar para o seu GitHub
1. Crie um novo repositório **Público** no seu GitHub (ex: `joaogpt`).
2. No seu terminal local, rode os seguintes comandos para subir o projeto:
   ```bash
   git init
   git add .
   git commit -m "feat: ChatGPT clone estático com suporte a Ollama"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
   git push -u origin main
   ```
   *(Substitua `SEU-USUARIO` e `NOME-DO-REPOSITORIO` pelos seus dados correspondentes)*

### Passo 2: Ativar o GitHub Pages no GitHub
1. No seu navegador, acesse o repositório criado no GitHub.
2. Vá na aba **Settings** (Configurações) no topo.
3. No menu lateral esquerdo, clique em **Pages**.
4. Em **Build and deployment** -> **Source**, garanta que está selecionado **Deploy from a branch**.
5. Em **Branch**, selecione `main` e a pasta `/ (root)`. Clique em **Save**.
6. Aguarde cerca de 1 a 2 minutos. O GitHub gerará um link no topo da página (ex: `https://seu-usuario.github.io/nome-do-repositorio/`).

---

## 🔌 Usando o GitHub Pages com o Ollama Local (Configuração de CORS)

Como o GitHub Pages roda sob um domínio seguro (`https://...`), se você tentar fazer chamadas diretas para o seu Ollama local rodando em HTTP (`http://localhost:11434`), o navegador poderá bloquear a requisição devido a restrições de CORS e Conteúdo Misto.

### Para liberar o acesso do navegador ao Ollama local:

#### No Windows:
1. Feche o Ollama totalmente (clique com o botão direito no ícone do Ollama na barra de tarefas do Windows perto do relógio e clique em **Quit**).
2. Abra o **PowerShell** e defina a variável de ambiente para liberar o CORS:
   ```powershell
   [System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', '*', 'User')
   ```
3. Abra o Ollama novamente pelo menu iniciar.
4. No site do seu **GitHub Pages**:
   * Clique em **Configurações** (engrenagem no canto inferior esquerdo).
   * Altere **Origem da API de Chat** para **Ollama Local Direto (Porta 11434)**.
   * Clique em **Salvar Alterações**.
5. Agora você poderá usar o site hospedado na nuvem para conversar com o seu modelo Qwen 2.5 local de forma direta!
