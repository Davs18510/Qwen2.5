// ==========================================================================
// CONFIGURAÇÕES E ESTADO DA APLICAÇÃO
// ==========================================================================

// Configurações padrão
const DEFAULT_SETTINGS = {
    systemInstruction: "Seu nome é joão",
    model: "qwen2.5:0.5b",
    apiType: "flask",          // "flask", "ollama" ou "custom"
    customApiUrl: ""           // URL customizada em HTTPS
};

// Variáveis de estado global
let chats = [];
let activeChatId = null;
let currentSettings = { ...DEFAULT_SETTINGS };
let isGenerating = false;

// Elementos do DOM
const sidebar = document.getElementById('sidebar');
const chatList = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const activeModelBadge = document.getElementById('active-model-badge');
const clearChatBtn = document.getElementById('clear-chat-btn');
const welcomeScreen = document.getElementById('welcome-screen');
const messagesContainer = document.getElementById('messages-container');
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator-container');

// Elementos do Modal de Configurações
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const systemInstructionInput = document.getElementById('system-instruction');
const modelSelect = document.getElementById('model-select');
const resetAllBtn = document.getElementById('reset-all-btn');

// Elementos novos para suporte ao GitHub Pages
const apiTypeSelect = document.getElementById('api-type');
const customApiWrapper = document.getElementById('custom-api-wrapper');
const customApiUrlInput = document.getElementById('custom-api-url');

// ==========================================================================
// CUSTOMIZAÇÃO DO PARSER DE MARKDOWN (MARKED.JS)
// ==========================================================================

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const langName = language || 'text';
    const codeString = typeof code === 'object' ? code.text : code;
    
    return `
        <div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-lang">${escapeHtml(langName)}</span>
                <button class="copy-code-btn" onclick="copyCodeText(this)">
                    <i class="fa-regular fa-clipboard"></i>
                    <span>Copiar</span>
                </button>
            </div>
            <pre><code class="language-${escapeHtml(langName)}">${escapeHtml(codeString)}</code></pre>
        </div>
    `;
};

marked.use({ renderer });

window.copyCodeText = function(button) {
    const wrapper = button.closest('.code-block-wrapper');
    const codeElement = wrapper.querySelector('pre code');
    if (!codeElement) return;
    
    const textToCopy = codeElement.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const icon = button.querySelector('i');
        const span = button.querySelector('span');
        
        icon.className = "fa-solid fa-check";
        icon.style.color = "#10a37f";
        span.textContent = "Copiado!";
        span.style.color = "#10a37f";
        
        setTimeout(() => {
            icon.className = "fa-regular fa-clipboard";
            icon.style.color = "";
            span.textContent = "Copiar";
            span.style.color = "";
        }, 2000);
    }).catch(err => {
        console.error("Falha ao copiar código: ", err);
    });
};

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadChats();
    fetchOllamaModels();
    setupEventListeners();
    initThemeOrWelcome();
});

function loadSettings() {
    const savedSettings = localStorage.getItem('joaogpt_settings');
    if (savedSettings) {
        try {
            currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        } catch (e) {
            currentSettings = { ...DEFAULT_SETTINGS };
        }
    } else {
        currentSettings = { ...DEFAULT_SETTINGS };
    }
    
    activeModelBadge.textContent = currentSettings.model;
}

function saveSettings(settings) {
    currentSettings = { ...currentSettings, ...settings };
    localStorage.setItem('joaogpt_settings', JSON.stringify(currentSettings));
    activeModelBadge.textContent = currentSettings.model;
}

function loadChats() {
    const savedChats = localStorage.getItem('joaogpt_chats');
    if (savedChats) {
        try {
            chats = JSON.parse(savedChats);
        } catch (e) {
            chats = [];
        }
    }
    renderSidebarChats();
}

// Busca os modelos Ollama de forma segura com base na API configurada
async function fetchOllamaModels() {
    try {
        let modelsEndpoint = '/api/models';
        
        // Ajusta o endpoint se estiver rodando de forma estática pura ou em outra porta
        if (currentSettings.apiType === 'ollama') {
            modelsEndpoint = 'http://localhost:11434/api/tags';
        } else if (currentSettings.apiType === 'custom' && currentSettings.customApiUrl) {
            // Tenta adivinhar o endpoint de tags a partir da URL da API customizada
            modelsEndpoint = currentSettings.customApiUrl.replace('/api/chat', '/api/models');
        } else {
            // Flask Local
            const runningOnFlask = window.location.port === '5000' || window.location.hostname === '127.0.0.1';
            if (!runningOnFlask) {
                modelsEndpoint = 'http://localhost:5000/api/models';
            }
        }

        const response = await fetch(modelsEndpoint);
        if (response.ok) {
            const data = await response.json();
            
            // Suporta o formato do Flask {'models': [...]} e do Ollama original {'models': [{'model': '...'}]}
            let models = [];
            if (Array.isArray(data.models)) {
                models = data.models.map(m => typeof m === 'object' ? m.model || m.name : m);
            } else if (data.models && typeof data.models === 'object') {
                models = Object.keys(data.models);
            } else {
                models = ['qwen2.5:0.5b'];
            }
            populateModelSelect(models);
        } else {
            populateModelSelect(['qwen2.5:0.5b']);
        }
    } catch (e) {
        console.warn("Utilizando modelo padrão por não conseguir conectar com a API de modelos: ", e.message);
        populateModelSelect(['qwen2.5:0.5b']);
    }
}

function populateModelSelect(models) {
    modelSelect.innerHTML = '';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        if (model === currentSettings.model) {
            option.selected = true;
        }
        modelSelect.appendChild(option);
    });
}

function initThemeOrWelcome() {
    const lastActiveId = localStorage.getItem('joaogpt_active_chat_id');
    if (lastActiveId && chats.some(c => c.id === lastActiveId)) {
        selectChat(lastActiveId);
    } else {
        showNewChatScreen();
    }
}

// ==========================================================================
// GERENCIAMENTO DA INTERFACE E EVENTOS
// ==========================================================================

function setupEventListeners() {
    newChatBtn.addEventListener('click', showNewChatScreen);
    
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        sendBtn.disabled = userInput.value.trim() === '' || isGenerating;
    });
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userInput.value.trim() !== '' && !isGenerating) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });
    
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage();
    });
    
    clearChatBtn.addEventListener('click', handleClearCurrentChat);
    openSettingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
    
    saveSettingsBtn.addEventListener('click', handleSaveSettings);
    resetAllBtn.addEventListener('click', handleResetAll);
    
    // Controle do menu deslizante mobile
    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });
    
    sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
    
    // Toggle condicional para URL da API Customizada
    apiTypeSelect.addEventListener('change', () => {
        customApiWrapper.style.display = apiTypeSelect.value === 'custom' ? 'block' : 'none';
    });
    
    // Sugestões de prompt
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            userInput.value = prompt;
            userInput.dispatchEvent(new Event('input'));
            userInput.focus();
            
            setTimeout(() => {
                handleSendMessage();
            }, 150);
        });
    });
}

// ==========================================================================
// HISTÓRICO DE CHATS
// ==========================================================================

function showNewChatScreen() {
    activeChatId = null;
    localStorage.removeItem('joaogpt_active_chat_id');
    
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    welcomeScreen.style.display = 'flex';
    messagesContainer.style.display = 'none';
    messagesContainer.innerHTML = '';
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    sidebar.classList.remove('open');
}

function renderSidebarChats() {
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        const li = document.createElement('li');
        li.style.padding = '12px';
        li.style.fontSize = '12px';
        li.style.color = 'var(--text-muted)';
        li.style.textAlign = 'center';
        li.textContent = 'Sem conversas anteriores';
        chatList.appendChild(li);
        return;
    }
    
    chats.slice().reverse().forEach(chat => {
        const li = document.createElement('li');
        li.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
        li.setAttribute('data-id', chat.id);
        
        li.innerHTML = `
            <div class="chat-item-left">
                <i class="fa-regular fa-message"></i>
                <span class="chat-item-title">${escapeHtml(chat.title)}</span>
            </div>
            <div class="chat-item-actions">
                <button class="action-icon-btn rename" title="Renomear conversa">
                    <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="action-icon-btn delete" title="Excluir conversa">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        
        li.addEventListener('click', (e) => {
            if (e.target.closest('.chat-item-actions')) return;
            selectChat(chat.id);
        });
        
        li.querySelector('.rename').addEventListener('click', (e) => {
            e.stopPropagation();
            renameChat(chat.id);
        });
        
        li.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        chatList.appendChild(li);
    });
}

function selectChat(chatId) {
    activeChatId = chatId;
    localStorage.setItem('joaogpt_active_chat_id', chatId);
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'flex';
    messagesContainer.innerHTML = '';
    
    chat.messages.forEach(msg => {
        appendMessageToUI(msg.role, msg.content);
    });
    
    scrollToBottom(true);
    renderSidebarChats();
    sidebar.classList.remove('open');
}

function renameChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const newTitle = prompt("Digite o novo título da conversa:", chat.title);
    if (newTitle && newTitle.trim() !== '') {
        chat.title = newTitle.trim();
        localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
        renderSidebarChats();
    }
}

function deleteChat(chatId) {
    if (confirm("Tem certeza de que deseja excluir esta conversa?")) {
        chats = chats.filter(c => c.id !== chatId);
        localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
        
        if (activeChatId === chatId) {
            showNewChatScreen();
        }
        
        renderSidebarChats();
    }
}

function handleClearCurrentChat() {
    if (activeChatId) {
        if (confirm("Limpar o histórico desta conversa ativa?")) {
            const chat = chats.find(c => c.id === activeChatId);
            if (chat) {
                chat.messages = [];
                localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
                selectChat(activeChatId);
            }
        }
    } else {
        showNewChatScreen();
    }
}

// ==========================================================================
// PROCESSO DE ENVIO E STREAMING (SSE & DIRECT OLLAMA CHUNKS)
// ==========================================================================

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (text === '' || isGenerating) return;
    
    if (!activeChatId) {
        const newChat = {
            id: 'chat_' + Date.now(),
            title: text.length > 28 ? text.substring(0, 25) + '...' : text,
            messages: [],
            systemInstruction: currentSettings.systemInstruction
        };
        chats.push(newChat);
        activeChatId = newChat.id;
        localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
        localStorage.setItem('joaogpt_active_chat_id', activeChatId);
        
        welcomeScreen.style.display = 'none';
        messagesContainer.style.display = 'flex';
        renderSidebarChats();
    }
    
    const activeChat = chats.find(c => c.id === activeChatId);
    activeChat.messages.push({ role: 'user', content: text });
    localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
    
    appendMessageToUI('user', text);
    
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    scrollToBottom(true);
    typingIndicator.style.display = 'block';
    scrollToBottom(true);
    
    isGenerating = true;
    
    // Injeção da mensagem do sistema
    const messagesPayload = [
        {
            role: 'system',
            content: activeChat.systemInstruction || currentSettings.systemInstruction
        },
        ...activeChat.messages
    ];
    
    const assistantMessageElement = createEmptyAssistantMessageElement();
    const assistantBodyElement = assistantMessageElement.querySelector('.message-body');
    
    let assistantText = '';
    
    // --------------------------------------------------------
    // DETERMINAÇÃO DO ENDPOINT DA API A SER UTILIZADO
    // --------------------------------------------------------
    let apiEndpoint = '/api/chat';
    let requestHeaders = { 'Content-Type': 'application/json' };
    let requestBody = {
        messages: messagesPayload,
        model: currentSettings.model
    };

    if (currentSettings.apiType === 'ollama') {
        apiEndpoint = 'http://localhost:11434/api/chat';
        requestBody = {
            model: currentSettings.model,
            messages: messagesPayload,
            stream: true
        };
    } else if (currentSettings.apiType === 'custom' && currentSettings.customApiUrl) {
        apiEndpoint = currentSettings.customApiUrl;
    } else {
        // Servidor Flask Local
        const runningOnFlask = window.location.port === '5000' || window.location.hostname === '127.0.0.1';
        if (!runningOnFlask) {
            apiEndpoint = 'http://localhost:5000/api/chat';
        }
    }

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Servidor respondeu com código: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        typingIndicator.style.display = 'none';
        messagesContainer.appendChild(assistantMessageElement);
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            
            // Decodifica suportando SSE (data: {...}) E NDJSON bruto do Ollama ({...})
            const lines = chunk.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if (trimmed.startsWith('data: ')) {
                    // Formato SSE do Flask local ou proxies customizados
                    try {
                        const jsonStr = trimmed.replace('data: ', '').trim();
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.content) {
                            assistantText += parsed.content;
                            assistantBodyElement.innerHTML = marked.parse(assistantText);
                            scrollToBottom();
                        }
                    } catch (e) {}
                } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    // Formato NDJSON bruto do Ollama local
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.message && parsed.message.content) {
                            assistantText += parsed.message.content;
                            assistantBodyElement.innerHTML = marked.parse(assistantText);
                            scrollToBottom();
                        }
                    } catch (e) {}
                }
            }
        }
        
        Prism.highlightAllUnder(assistantBodyElement);
        activeChat.messages.push({ role: 'assistant', content: assistantText });
        localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
        
    } catch (error) {
        console.error("Erro de comunicação: ", error);
        typingIndicator.style.display = 'none';
        
        if (!messagesContainer.contains(assistantMessageElement)) {
            messagesContainer.appendChild(assistantMessageElement);
        }
        
        let customHelpMessage = "";
        if (currentSettings.apiType === 'ollama') {
            customHelpMessage = "<br><small style='color: var(--text-muted)'>Certifique-se de que o Ollama está rodando localmente na porta 11434 com CORS liberado. Rode no terminal:<br><code>$env:OLLAMA_ORIGINS='*'</code> e inicie o Ollama.</small>";
        } else if (currentSettings.apiType === 'flask') {
            customHelpMessage = "<br><small style='color: var(--text-muted)'>Certifique-se de que o servidor Flask (app.py) está ativo localmente rodando em segundo plano.</small>";
        }

        assistantBodyElement.innerHTML = `<p style="color: var(--danger-color); font-weight: 500;">
            <i class="fa-solid fa-triangle-exclamation"></i> Falha ao conectar com o serviço do Chatbot.
            ${customHelpMessage}
            <br><small style="color: var(--text-muted); font-weight: normal; margin-top: 4px; display: inline-block;">Erro: ${error.message}</small>
        </p>`;
    } finally {
        isGenerating = false;
        sendBtn.disabled = userInput.value.trim() === '';
        scrollToBottom();
    }
}

function appendMessageToUI(role, content) {
    const isUser = role === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    const parsedContent = isUser ? escapeHtml(content) : marked.parse(content);
    
    row.innerHTML = `
        <div class="message-container-inner">
            <div class="avatar ${isUser ? 'user-avatar-chat' : 'assistant-avatar'}">
                <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-body">${parsedContent}</div>
        </div>
    `;
    
    messagesContainer.appendChild(row);
    
    if (!isUser) {
        Prism.highlightAllUnder(row);
    }
}

function createEmptyAssistantMessageElement() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    
    row.innerHTML = `
        <div class="message-container-inner">
            <div class="avatar assistant-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-body"><span style="color: var(--text-muted); font-style: italic;">Pensando...</span></div>
        </div>
    `;
    
    return row;
}

function scrollToBottom(force = false) {
    const threshold = 150;
    const isNearBottom = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < threshold;
    
    if (force || isNearBottom) {
        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior: force ? 'auto' : 'smooth'
        });
    }
}

// ==========================================================================
// CONFIGURAÇÕES (MODAL)
// ==========================================================================

function openSettings() {
    systemInstructionInput.value = currentSettings.systemInstruction;
    
    // Restaura modelo selecionado
    for (let i = 0; i < modelSelect.options.length; i++) {
        if (modelSelect.options[i].value === currentSettings.model) {
            modelSelect.selectedIndex = i;
            break;
        }
    }

    // Restaura origem da API selecionada
    const apiType = currentSettings.apiType || "flask";
    apiTypeSelect.value = apiType;
    
    if (apiType === 'custom') {
        customApiWrapper.style.display = 'block';
        customApiUrlInput.value = currentSettings.customApiUrl || "";
    } else {
        customApiWrapper.style.display = 'none';
        customApiUrlInput.value = "";
    }
    
    settingsModal.style.display = 'flex';
}

function closeSettings() {
    settingsModal.style.display = 'none';
}

function handleSaveSettings() {
    const systemInstruction = systemInstructionInput.value.trim() || DEFAULT_SETTINGS.systemInstruction;
    const model = modelSelect.value || DEFAULT_SETTINGS.model;
    const apiType = apiTypeSelect.value || "flask";
    const customApiUrl = customApiUrlInput.value.trim();
    
    if (apiType === 'custom' && !customApiUrl) {
        alert("Por favor, digite a URL da API Customizada ou selecione outra origem.");
        return;
    }
    
    const oldApiType = currentSettings.apiType;
    saveSettings({ systemInstruction, model, apiType, customApiUrl });
    
    // Se mudou o tipo de API, busca novamente os modelos para ver se atualiza
    if (oldApiType !== apiType) {
        fetchOllamaModels();
    }
    
    // Atualiza a primeira instrução de chat ativo se não houver mensagens ainda
    if (activeChatId) {
        const activeChat = chats.find(c => c.id === activeChatId);
        if (activeChat && activeChat.messages.length === 0) {
            activeChat.systemInstruction = systemInstruction;
            localStorage.setItem('joaogpt_chats', JSON.stringify(chats));
        }
    }
    
    closeSettings();
    alert("Configurações salvas com sucesso!");
}

function handleResetAll() {
    if (confirm("CUIDADO: Isso apagará todas as conversas e configurações personalizadas. Continuar?")) {
        localStorage.removeItem('joaogpt_chats');
        localStorage.removeItem('joaogpt_settings');
        localStorage.removeItem('joaogpt_active_chat_id');
        
        chats = [];
        currentSettings = { ...DEFAULT_SETTINGS };
        
        closeSettings();
        loadSettings();
        showNewChatScreen();
        renderSidebarChats();
        alert("Todos os dados foram resetados!");
    }
}
