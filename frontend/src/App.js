import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { createNewChat, sendMessage, uploadDocument, uploadImage } from "./api";
import "./App.css";

// Icons (inline SVG to avoid extra deps) 
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);
const ImgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

// Typing indicator 
const TypingDots = () => (
  <div className="typing-dots">
    <span /><span /><span />
  </div>
);

// Single message bubble 
const Message = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`message ${isUser ? "message--user" : "message--bot"}`}>
      {!isUser && (
        <div className="avatar avatar--bot"><BotIcon /></div>
      )}
      <div className="bubble">
        {msg.imagePreview && (
          <img src={msg.imagePreview} alt="uploaded" className="bubble__image-preview" />
        )}
        {msg.docName && (
          <div className="bubble__doc-tag"><DocIcon /> {msg.docName}</div>
        )}
        {isUser ? (
          <p>{msg.text}</p>
        ) : (
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        )}
        <span className="bubble__time">{msg.time}</span>
      </div>
      {isUser && (
        <div className="avatar avatar--user">U</div>
      )}
    </div>
  );
};

// Sidebar chat item 
const ChatItem = ({ chat, active, onClick, onDelete }) => (
  <div className={`chat-item ${active ? "chat-item--active" : ""}`} onClick={onClick}>
    <div className="chat-item__label">
      <span className="chat-item__title">{chat.title}</span>
      <span className="chat-item__count">{chat.messageCount} msgs</span>
    </div>
    <button
      className="chat-item__delete"
      onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
      title="Delete chat"
    >
      <TrashIcon />
    </button>
  </div>
);

// Main App 
export default function App() {
  const [chats, setChats] = useState([]); // [{ id, title, messageCount }]
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]); // [{ role, text, time, imagePreview?, docName? }]
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: "doc"|"img", name, preview? }
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Create first chat on mount
 useEffect(() => {
    handleNewChat();
  }, []); // eslint-disable-line

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // New chat 
  const handleNewChat = useCallback(async () => {
    try {
      const chatId = await createNewChat();
      const chat = { id: chatId, title: `Chat ${Date.now().toString().slice(-4)}`, messageCount: 0 };
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chatId);
      setMessages([]);
      setUploadStatus(null);
      setError(null);
      setInput("");
    } catch {
      setError("Failed to create new chat. Is the backend running?");
    }
  }, []);

  // Switch chat 
  const handleSwitchChat = (chat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages || []);
    setUploadStatus(chat.uploadStatus || null);
    setError(null);
  };

  // Delete chat 
  const handleDeleteChat = (chatId) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setMessages([]);
      setUploadStatus(null);
      setActiveChatId(null);
      setTimeout(handleNewChat, 0);
    }
  };

  // Upload document 
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(activeChatId, file);
      const status = { type: "doc", name: file.name, preview: result.preview };
      setUploadStatus(status);
      // Add a system message in the chat
      const sysMsg = {
        role: "user",
        text: `📄 Uploaded document: ${file.name}`,
        docName: file.name,
        time: now(),
      };
      addMessage(sysMsg);
    } catch (err) {
      setError("Document upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Upload image 
  const handleImgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadImage(activeChatId, file);
      const status = { type: "img", name: file.name, preview: result.previewDataUrl };
      setUploadStatus(status);
      const sysMsg = {
        role: "user",
        text: `🖼️ Uploaded image: ${file.name}`,
        imagePreview: result.previewDataUrl,
        time: now(),
      };
      addMessage(sysMsg);
    } catch (err) {
      setError("Image upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Add message helper 
  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messageCount: c.messageCount + 1,
              messages: [...(c.messages || []), msg],
              uploadStatus: uploadStatus,
            }
          : c
      )
    );
  };

  // Send message 
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeChatId || isLoading) return;

    const userMsg = { role: "user", text, time: now() };
    addMessage(userMsg);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const reply = await sendMessage(activeChatId, text);
      const botMsg = { role: "model", text: reply, time: now() };
      addMessage(botMsg);
      // Update chat title from first real message
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId && c.title.startsWith("Chat ")
            ? { ...c, title: text.slice(0, 28) + (text.length > 28 ? "…" : "") }
            : c
        )
      );
    } catch (err) {
      setError("Failed to get response: " + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard handler 
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea 
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__header">
          <span className="sidebar__logo">
            <span className="logo-gem">✦</span> Gemini
          </span>
          <button className="btn-icon" onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
            ☰
          </button>
        </div>

        <button className="btn-new-chat" onClick={handleNewChat}>
          <PlusIcon /> New Chat
        </button>

        <div className="sidebar__chats">
          {chats.length === 0 && (
            <p className="sidebar__empty">No chats yet</p>
          )}
          {chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onClick={() => handleSwitchChat(chat)}
              onDelete={handleDeleteChat}
            />
          ))}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <main className="chat-area">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header__left">
            {!sidebarOpen && (
              <button className="btn-icon" onClick={() => setSidebarOpen(true)}>☰</button>
            )}
            <span className="chat-header__title">
              {activeChat?.title || "Gemini Chatbot"}
            </span>
          </div>
          <div className="chat-header__badges">
            {uploadStatus?.type === "doc" && (
              <span className="badge badge--doc"><DocIcon /> {uploadStatus.name}</span>
            )}
            {uploadStatus?.type === "img" && (
              <span className="badge badge--img"><ImgIcon /> {uploadStatus.name}</span>
            )}
          </div>
          <button className="btn-new-chat-header" onClick={handleNewChat}>
            <PlusIcon /> New Chat
          </button>
        </header>

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">✦</div>
              <h2>Gemini Chatbot</h2>
              <p>Ask anything. Upload a document or image to analyze it with AI.</p>
              <div className="empty-state__hints">
                <div className="hint">📄 Upload PDF/TXT → ask questions about it</div>
                <div className="hint">🖼️ Upload an image → get visual analysis</div>
                <div className="hint">💬 Chat freely with context memory</div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {isLoading && (
            <div className="message message--bot">
              <div className="avatar avatar--bot"><BotIcon /></div>
              <div className="bubble"><TypingDots /></div>
            </div>
          )}

          {error && (
            <div className="error-banner">⚠️ {error}</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Image preview strip */}
        {uploadStatus?.type === "img" && uploadStatus.preview && (
          <div className="img-preview-strip">
            <img src={uploadStatus.preview} alt="preview" />
            <span>Image ready — ask about it below</span>
          </div>
        )}

        {/* Input area */}
        <div className="input-area">
          <div className="input-row">
            {/* Hidden file inputs */}
            <input
              type="file"
              accept=".pdf,.txt"
              ref={docInputRef}
              onChange={handleDocUpload}
              style={{ display: "none" }}
            />
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              ref={imgInputRef}
              onChange={handleImgUpload}
              style={{ display: "none" }}
            />

            {/* Upload buttons */}
            <button
              className="btn-upload"
              onClick={() => docInputRef.current?.click()}
              disabled={isUploading || !activeChatId}
              title="Upload PDF or TXT"
            >
              {isUploading ? <span className="spinner" /> : <DocIcon />}
            </button>

            <button
              className="btn-upload"
              onClick={() => imgInputRef.current?.click()}
              disabled={isUploading || !activeChatId}
              title="Upload PNG or JPG"
            >
              {isUploading ? <span className="spinner" /> : <ImgIcon />}
            </button>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!activeChatId}
            />

            {/* Send button */}
            <button
              className="btn-send"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !activeChatId}
            >
              {isLoading ? <span className="spinner" /> : <SendIcon />}
            </button>
          </div>

          <p className="input-area__hint">
            Gemini 2.5 Flash · Context resets on New Chat · No data stored
          </p>
        </div>
      </main>
    </div>
  );
}
