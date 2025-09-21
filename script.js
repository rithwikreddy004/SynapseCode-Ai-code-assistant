document.addEventListener("DOMContentLoaded", () => {
  // --- Dark Mode Toggle ---
  const darkModeToggle = document.getElementById("darkModeToggle");
  const body = document.body;

  const prefersDark = localStorage.getItem("darkMode") === "true";
  if (prefersDark) {
    body.classList.add("dark-mode");
    darkModeToggle.checked = true;
  }
  darkModeToggle.addEventListener("change", () => {
    body.classList.toggle("dark-mode", darkModeToggle.checked);
    localStorage.setItem("darkMode", darkModeToggle.checked);
  });

  // --- DOM Elements ---
  const promptInput = document.getElementById("promptInput");
  const sendBtn = document.getElementById("sendBtn");
  const chatArea = document.getElementById("chatArea");
  const historyList = document.getElementById("historyList");
  const newChatBtn = document.getElementById("newChatBtn");
  const sidebar = document.getElementById("sidebar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");

  // --- State ---
  let currentChat = [];
  let currentChatId = null;
  let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  let isGenerating = false;

  // ---------- Helpers ----------
  function appendMessage(sender, content, animated = false) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender === "user" ? "user-message" : "ai-message");

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = sender === "user" ? "👤" : "🤖";

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");

    msg.appendChild(avatar);
    msg.appendChild(contentDiv);
    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;

    if (animated && sender === "ai") {
      typeResponse(content, contentDiv, msg);
    } else {
      contentDiv.innerHTML = marked.parse(content);
      if (sender === "ai") addFooterButtons(msg, content);
      hljs.highlightAll();
    }
  }

  function addFooterButtons(msgDiv, content) {
    const footer = document.createElement("div");
    footer.classList.add("message-footer");
    footer.innerHTML = `
      <button class="action-btn copy-btn">📋 <span>Copy</span></button>
      <button class="action-btn redo-btn">🔄 <span>Redo</span></button>
    `;
    msgDiv.appendChild(footer);

    footer.querySelector(".copy-btn").addEventListener("click", () => handleCopy(content));
    footer.querySelector(".redo-btn").addEventListener("click", handleRedo);
  }

  function typeResponse(text, targetEl, msgDiv) {
    let i = 0;
    targetEl.innerHTML = "";
    const interval = setInterval(() => {
      if (i < text.length) {
        targetEl.innerHTML += text[i++];
        chatArea.scrollTop = chatArea.scrollHeight;
      } else {
        clearInterval(interval);
        targetEl.innerHTML = marked.parse(text);
        addFooterButtons(msgDiv, text);
        hljs.highlightAll();
      }
    }, 15);
  }

  function handleCopy(content) {
    navigator.clipboard.writeText(content).then(() => {
      const btn = event.target.closest(".copy-btn");
      const span = btn.querySelector("span");
      const original = span.textContent;
      span.textContent = "Copied!";
      setTimeout(() => (span.textContent = original), 2000);
    });
  }

  function handleRedo() {
    const lastUser = [...currentChat].reverse().find((m) => m.role === "user");
    if (lastUser) handleChatSubmission(lastUser.content);
  }

  // ---------- Chat / API ----------
  async function handleChatSubmission(prompt = promptInput.value.trim()) {
    if (!prompt || isGenerating) return;

    isGenerating = true;
    sendBtn.disabled = true;

    appendMessage("user", prompt);
    currentChat.push({ role: "user", content: prompt });
    promptInput.value = "";
    promptInput.style.height = "auto";

    // placeholder
    const aiMsg = document.createElement("div");
    aiMsg.classList.add("message", "ai-message");
    aiMsg.innerHTML = `<div class="avatar">🤖</div>
      <div class="message-content"><p class="placeholder-text">...</p></div>`;
    chatArea.appendChild(aiMsg);
    chatArea.scrollTop = chatArea.scrollHeight;
    const contentDiv = aiMsg.querySelector(".message-content");

    try {
      const res = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const text = data.code || "No content generated.";

      currentChat.push({ role: "ai", content: text });
      saveHistory();
      typeResponse(text, contentDiv, aiMsg);
    } catch (err) {
      console.error("Fetch error:", err);
      const error = "Failed to connect to the server.";
      currentChat.push({ role: "ai", content: error });
      saveHistory();
      contentDiv.innerHTML = `<p class="error-text">${error}</p>`;
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
    }
  }

  // ---------- History ----------
  function saveHistory() {
    if (!currentChat.length) return;
    const title = currentChat[0].content.slice(0, 30).trim() + "...";
    const chat = { id: currentChatId || Date.now(), title, messages: currentChat };
    const idx = history.findIndex((c) => c.id === chat.id);
    idx >= 0 ? (history[idx] = chat) : history.unshift(chat);
    currentChatId = chat.id;
    localStorage.setItem("chatHistory", JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    history.forEach((chat) => {
      const li = document.createElement("li");
      li.classList.add("history-item");
      li.dataset.id = chat.id;
      li.innerHTML = `<span class="icon">💬</span><span class="text">${chat.title}</span>`;

      const del = document.createElement("button");
      del.classList.add("delete-btn");
      del.innerHTML = "🗑️";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
      });

      li.appendChild(del);
      li.addEventListener("click", (e) => {
        if (!e.target.closest(".delete-btn")) loadChat(chat);
      });
      historyList.appendChild(li);
    });
  }

  function deleteChat(id) {
    history = history.filter((c) => c.id !== id);
    localStorage.setItem("chatHistory", JSON.stringify(history));
    renderHistory();
    if (currentChatId === id) {
      currentChat = [];
      currentChatId = null;
      chatArea.innerHTML = `<div class="message ai-message welcome-message">
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
    chatArea.innerHTML = "";
    currentChat.forEach((m) => appendMessage(m.role, m.content));
    document.querySelectorAll(".history-item").forEach((el) =>
      el.classList.toggle("active", parseInt(el.dataset.id) === chat.id)
    );
  }

  // ---------- Events ----------
  promptInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = `${this.scrollHeight}px`;
  });
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmission();
    }
  });
  sendBtn.addEventListener("click", () => handleChatSubmission());
  newChatBtn.addEventListener("click", () => {
    currentChat = [];
    currentChatId = null;
    chatArea.innerHTML = `<div class="message ai-message welcome-message">
        <div class="avatar">🤖</div>
        <div class="message-content">
          <p>Hello! How can I assist you today? Type a prompt below to generate code.</p>
        </div>
      </div>`;
    document.querySelectorAll(".history-item").forEach((el) => el.classList.remove("active"));
    promptInput.focus();
  });
  hamburgerBtn.addEventListener("click", () => sidebar.classList.toggle("open"));

  renderHistory();
});
