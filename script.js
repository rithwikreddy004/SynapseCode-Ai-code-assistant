document.addEventListener('DOMContentLoaded', () => {

    // --- NEW: Dark Mode Toggle Logic ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Check for saved dark mode preference
    const prefersDarkMode = localStorage.getItem('darkMode') === 'true';
    if (prefersDarkMode) {
        body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // Listen for the toggle change event
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    });

    // --- DOM Elements ---
    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatArea = document.getElementById('chatArea');
    const historyList = document.getElementById('historyList');
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    // --- State Variables ---
    let currentChat = [];
    let currentChatId = null;
    let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    let isGenerating = false;

    // --- Core Functions ---

    /**
     * Appends a new message to the chat area.
     * @param {string} sender 'user' or 'ai'
     * @param {string} content The raw text content of the message
     * @param {boolean} isAnimated Whether to use a typing effect
     */
    function appendMessage(sender, content, isAnimated = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;

        if (isAnimated) {
            typeResponse(content, contentDiv, messageDiv);
        } else {
            contentDiv.innerHTML = marked.parse(content);
            if (sender === 'ai') {
                addFooterButtons(messageDiv, content);
            }
            hljs.highlightAll();
        }
    }

    /**
     * Adds the footer buttons (Copy, Redo) to an AI message.
     */
    function addFooterButtons(messageDiv, content) {
        const footerDiv = document.createElement('div');
        footerDiv.classList.add('message-footer');
        footerDiv.innerHTML = `
            <button class="action-btn copy-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
            </button>
            <button class="action-btn redo-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-refresh-ccw"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.5 15a8 8 0 1 0 0-11.4l-2 2"></path></svg>
                <span>Redo</span>
            </button>
        `;
        messageDiv.appendChild(footerDiv);

        footerDiv.querySelector('.copy-btn').addEventListener('click', () => handleCopy(content));
        footerDiv.querySelector('.redo-btn').addEventListener('click', () => handleRedo());
    }

    /**
     * Simulates a typing effect for the AI's response.
     */
    function typeResponse(text, targetElement) {
        let currentIndex = 0;
        targetElement.innerHTML = '';
        const messageDiv = targetElement.closest('.message');

        const interval = setInterval(() => {
            if (currentIndex < text.length) {
                targetElement.innerHTML += text[currentIndex];
                currentIndex++;
                chatArea.scrollTop = chatArea.scrollHeight;
            } else {
                clearInterval(interval);
                targetElement.innerHTML = marked.parse(text);
                addFooterButtons(messageDiv, text);
                hljs.highlightAll();
            }
        }, 15);
    }

    function handleCopy(content) {
        navigator.clipboard.writeText(content).then(() => {
            const button = event.target.closest('.copy-btn');
            const originalText = button.querySelector('span').textContent;
            button.querySelector('span').textContent = 'Copied!';
            setTimeout(() => {
                button.querySelector('span').textContent = originalText;
            }, 2000);
        });
    }

    function handleRedo() {
        const lastUserMessage = currentChat.findLast(msg => msg.role === 'user');
        if (lastUserMessage) {
            handleChatSubmission(lastUserMessage.content);
        }
    }

    // --- Chat Submission and API Call ---
    async function handleChatSubmission(prompt = promptInput.value.trim()) {
        if (!prompt || isGenerating) return;

        isGenerating = true;
        sendBtn.disabled = true;

        appendMessage('user', prompt);
        currentChat.push({ role: 'user', content: prompt });
        promptInput.value = '';
        promptInput.style.height = 'auto';

        const aiMessagePlaceholder = document.createElement('div');
        aiMessagePlaceholder.classList.add('message', 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.textContent = '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = `<p class="placeholder-text">...</p>`;

        aiMessagePlaceholder.appendChild(avatarDiv);
        aiMessagePlaceholder.appendChild(contentDiv);
        chatArea.appendChild(aiMessagePlaceholder);
        chatArea.scrollTop = chatArea.scrollHeight;

        try {
            //const response = await fetch('http://localhost:3000/generate-code', {
            const response = await fetch('/api/generate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();
            const aiResponseContent = data.code || "An error occurred. No content was generated.";

            currentChat.push({ role: 'ai', content: aiResponseContent });
            saveHistory();

            typeResponse(aiResponseContent, contentDiv);

        } catch (error) {
            console.error('Fetch error:', error);
            const errorMessage = "Failed to connect to the server. Please check the backend.";
            currentChat.push({ role: 'ai', content: errorMessage });
            saveHistory();
            contentDiv.innerHTML = `<p class="error-text">${errorMessage}</p>`;
        } finally {
            isGenerating = false;
            sendBtn.disabled = false;
        }
    }

    // --- History Management ---
    function saveHistory() {
        if (currentChat.length > 0) {
            const chatTitle = currentChat[0].content.substring(0, 30).trim() + '...';
            const newChat = {
                id: currentChatId || Date.now(),
                title: chatTitle,
                messages: currentChat
            };

            const existingChatIndex = history.findIndex(chat => chat.id === newChat.id);
            if (existingChatIndex > -1) {
                history[existingChatIndex] = newChat;
            } else {
                history.unshift(newChat);
                currentChatId = newChat.id;
            }
            localStorage.setItem('chatHistory', JSON.stringify(history));
            renderHistory();
        }
    }

    function renderHistory() {
        historyList.innerHTML = '';
        history.forEach(chat => {
            const li = document.createElement('li');
            li.classList.add('history-item');
            li.setAttribute('data-id', chat.id);

            li.innerHTML = `<span class="icon">💬</span><span class="text">${chat.title}</span>`;

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            `;
            li.appendChild(deleteBtn);

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) {
                    loadChat(chat);
                }
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chat.id);
            });

            historyList.appendChild(li);
        });
    }

    function deleteChat(id) {
        history = history.filter(chat => chat.id !== id);
        localStorage.setItem('chatHistory', JSON.stringify(history));
        renderHistory();

        if (currentChatId === id) {
            currentChat = [];
            currentChatId = null;
            chatArea.innerHTML = `
                <div class="message ai-message welcome-message">
                    <div class="avatar">🤖</div>
                    <div class="message-content">
                        <p>Hello! How can I assist you today? Type a prompt below to generate code.</p>
                    </div>
                </div>`;
        }
    }

    function loadChat(chat) {
        currentChat = chat.messages;
        currentChatId = chat.id;
        chatArea.innerHTML = '';
        currentChat.forEach(msg => appendMessage(msg.role, msg.content));

        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === chat.id) {
                item.classList.add('active');
            }
        });
    }

    // --- Event Listeners and Initial Load ---
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    promptInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleChatSubmission();
        }
    });

    sendBtn.addEventListener('click', () => handleChatSubmission());

    newChatBtn.addEventListener('click', () => {
        currentChat = [];
        currentChatId = null;
        chatArea.innerHTML = `
            <div class="message ai-message welcome-message">
                <div class="avatar">🤖</div>
                <div class="message-content">
                    <p>Hello! How can I assist you today? Type a prompt below to generate code.</p>
                </div>
            </div>`;
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
        promptInput.focus();
    });

    // Mobile sidebar toggle
    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    renderHistory();
});