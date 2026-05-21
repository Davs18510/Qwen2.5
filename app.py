import os
import json
import logging
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
import ollama

# Configurar logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Permite requisições de outras origens se necessário

@app.route('/')
def index():
    """Serve o arquivo principal do frontend."""
    return app.send_static_file('index.html')

@app.route('/api/models', methods=['GET'])
def get_models():
    """Retorna a lista de modelos do Ollama disponíveis no sistema."""
    try:
        logging.info("Buscando modelos do Ollama...")
        res = ollama.list()
        models = []
        
        # Extração segura dos nomes dos modelos
        if hasattr(res, 'models'):
            for m in res.models:
                models.append(m.model)
        elif isinstance(res, dict) and 'models' in res:
            for m in res['models']:
                if isinstance(m, dict):
                    models.append(m.get('model'))
                else:
                    models.append(getattr(m, 'model', str(m)))
        else:
            models = ['qwen2.5:0.5b']
            
        logging.info(f"Modelos encontrados: {models}")
        return jsonify({'models': models})
    except Exception as e:
        logging.error(f"Erro ao buscar modelos: {str(e)}")
        # Retorna o modelo padrão como fallback
        return jsonify({'models': ['qwen2.5:0.5b'], 'error': str(e)})

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Recebe o histórico de mensagens e retorna uma resposta do Ollama em formato de stream.
    Isso fornece um efeito fluido de digitação igual ao ChatGPT.
    """
    data = request.json or {}
    messages = data.get('messages', [])
    model = data.get('model', 'qwen2.5:0.5b')
    
    if not messages:
        return jsonify({'error': 'Nenhuma mensagem fornecida'}), 400
        
    logging.info(f"Iniciando chat com modelo: {model}. Qtd mensagens: {len(messages)}")

    def generate():
        try:
            # Chama o ollama.chat com stream=True
            response = ollama.chat(model=model, messages=messages, stream=True)
            for chunk in response:
                content = chunk.get('message', {}).get('content', '')
                if content:
                    # Envia no formato padrão Server-Sent Events (SSE)
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception as e:
            logging.error(f"Erro no streaming do Ollama: {str(e)}")
            yield f"data: {json.dumps({'error': f'Erro ao obter resposta do modelo: {str(e)}'})}\n\n"

    # Retorna a resposta como text/event-stream para o frontend ler em tempo real
    return Response(generate(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  # Evita cache/buffering em proxys como Nginx
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logging.info(f"Servidor Flask iniciado na porta {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
