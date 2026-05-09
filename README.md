
<!-- gemini chatbot -->
A minimal yet polished web-based chatbot powered by gemini's API.  
Supports text conversation, PDF/TXT document upload, image upload, multi-chat sessions, and context tracking — all in-memory with no database.

<!-- Project structure -->
gemini-chatbot/
├── backend/               # Node.js + Express API server
│   ├── server.js          # Main server (routes, Gemini integration, file handling)
│   ├── package.json
│   └── .env.example       # Template for your API key
│
├── frontend/              # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Main chat UI component
│   │   ├── App.css        # Full styling (dark terminal aesthetic)
│   │   ├── api.js         # Axios helper for all backend calls
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Global CSS reset & variables
│   └── package.json
│
└── README.md

<!-- instructinos to get the gemini api key -->
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a free API key.
2. In the `backend/` directory, create a file called `.env`:

```bash
cd backend
cp .env
```

3. Open `.env` and replace the placeholder:

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=5000
```
Never commit the `.env` file — it's already in `.gitignore`.


 <!-- How to Install & Run -->

<!-- Prerequisites -->
- **Node.js** v18 or later
- **npm** v9 or later



 <!-- 1. Clone the repository -->

```bash
git clone https://github.com/YOUR_USERNAME/gemini-chatbot.git
cd gemini-chatbot
```


<!-- 2. Start the Backend -->

```bash
cd backend
npm install
npm start
```

The backend runs at http://localhost:5000

Expected output:
```
Backend running at http://localhost:5000
```


<!-- 3. Start the Frontend -->

Open a new terminal tab, then:

```bash
cd frontend
npm install
npm start
```

The React app opens at http://localhost:3000





<!-- API Endpoints (Backend) -->

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/new` | Create a new chat session → returns `chatId` |
| POST | `/api/chat/:chatId/message` | Send a message, get Gemini reply |
| POST | `/api/chat/:chatId/upload/document` | Upload PDF or TXT |
| POST | `/api/chat/:chatId/upload/image` | Upload PNG or JPG |
| GET | `/api/chat/:chatId/history` | Get message history |
| DELETE | `/api/chat/:chatId` | Delete a chat session |


<!-- Tech Stack used -->

**Backend:** Node.js · Express · Multer · pdf-parse · @google/generative-ai · uuid · dotenv  
**Frontend:** React 18 · Axios · react-markdown  
**AI Model:** Gemini 1.5 Flash (via Google Generative AI SDK)



<!-- Troubleshooting -->

**"Failed to get response"** → Check that your `GEMINI_API_KEY` is set correctly in `backend/.env`

**CORS error in browser** → Make sure backend is running on port 5000 before starting frontend

**pdf-parse issues on Mac M-chip** → Try `npm install --legacy-peer-deps` in `backend/`

**Port already in use** → Change `PORT=5001` in `.env` and update the proxy in `frontend/package.json`
