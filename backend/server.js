
require("dotenv").config();
console.log("Key loaded:", process.env.GEMINI_API_KEY ? "YES " : "NO ");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Multer: store uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "text/plain", "image/png", "image/jpeg", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"), false);
  },
});

//in memory chat store
// Structure: { [chatId]: { messages: [], documentText: null, imageData: null } }
const chatStore = {};

// gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get or create chat session
function getChat(chatId) {
  if (!chatStore[chatId]) {
    chatStore[chatId] = {
      messages: [],       // { role: "user"|"model", parts: [{text}] }
      documentText: null, // extracted text from PDF/TXT
      imageData: null,    // { base64: string, mimeType: string }
    };
  }
  return chatStore[chatId];
}

//Route: create new chat
app.post("/api/chat/new", (req, res) => {
  const chatId = uuidv4();
  chatStore[chatId] = { messages: [], documentText: null, imageData: null };
  res.json({ chatId });
});

// Route:upload document
app.post("/api/chat/:chatId/upload/document", upload.single("file"), async (req, res) => {
  try {
    const { chatId } = req.params;
    const session = getChat(chatId);

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let text = "";

    if (req.file.mimetype === "application/pdf") {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (req.file.mimetype === "text/plain") {
      text = req.file.buffer.toString("utf-8");
    }

    session.documentText = text;

    res.json({
      success: true,
      filename: req.file.originalname,
      preview: text.slice(0, 200) + (text.length > 200 ? "…" : ""),
    });
  } catch (err) {
    console.error("Document upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

//route: upload image
app.post("/api/chat/:chatId/upload/image", upload.single("file"), async (req, res) => {
  try {
    const { chatId } = req.params;
    const session = getChat(chatId);

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const base64 = req.file.buffer.toString("base64");
    session.imageData = { base64, mimeType: req.file.mimetype };

    res.json({
      success: true,
      filename: req.file.originalname,
      previewDataUrl: `data:${req.file.mimetype};base64,${base64}`,
    });
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Route: send message to chat
app.post("/api/chat/:chatId/message", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const session = getChat(chatId);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // build the user message parts
    const userParts = [];

    // 1. System context: include document text if available
    if (session.documentText) {
      userParts.push({
        text: `[Uploaded document content — refer to this when answering questions about the document]\n\n${session.documentText}\n\n---\n`,
      });
    }

    // 2. The actual user message
    userParts.push({ text: message });

    // 3. Attach image inline if available
    if (session.imageData) {
      userParts.push({
        inlineData: {
          mimeType: session.imageData.mimeType,
          data: session.imageData.base64,
        },
      });
    }

    //Build history for the API (all previous turns) 
    // Gemini expects alternating user/model roles
    const history = session.messages.map((m) => ({
      role: m.role,
      parts: m.parts,
    }));

    // Start chat with history 
    const chat = model.startChat({ history });

    // Send message
    const result = await chat.sendMessage(userParts);
    const botText = result.response.text();

    // Persist turns to session 
    session.messages.push({ role: "user", parts: [{ text: message }] });
    session.messages.push({ role: "model", parts: [{ text: botText }] });

    res.json({ reply: botText });
  } catch (err) {
    console.error("Message error:", err);
    res.status(500).json({ error: err.message || "Gemini API error" });
  }
});

// Route: Get chat history 
app.get("/api/chat/:chatId/history", (req, res) => {
  const { chatId } = req.params;
  const session = chatStore[chatId];
  if (!session) return res.status(404).json({ error: "Chat not found" });

  res.json({
    messages: session.messages,
    hasDocument: !!session.documentText,
    hasImage: !!session.imageData,
  });
});

// Route: Delete / reset chat 
app.delete("/api/chat/:chatId", (req, res) => {
  const { chatId } = req.params;
  delete chatStore[chatId];
  res.json({ success: true });
});

// Root health check 
app.get("/", (req, res) => res.json({ status: "Gemini Chatbot Backend running " }));

// Start server 
app.listen(PORT, () => {
  console.log(`\Backend running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — set it in backend/.env");
  }
});
