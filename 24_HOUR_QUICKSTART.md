# ✅ Getting Started Checklist - First 24 Hours

## 🎯 Goal: Get a basic chatbot working in 24 hours

This checklist will guide you through the absolute minimum steps to get a working prototype.

---

## ☑️ Hour 1: Decision Making & Account Setup

### Choose Your AI Provider

- [ ] Read the **AI_PROVIDER_COMPARISON.md** (Quick decision section)
- [ ] Decision: ******\_****** (OpenAI / Gemini / Claude)

**Recommendation for first 24 hours**: **Google Gemini (Free tier)**

- ✅ No credit card needed
- ✅ Zero cost
- ✅ Sufficient for testing
- ✅ 5 minutes to get API key

### Get API Key

**If you chose Gemini (Recommended):**

1. [ ] Go to https://ai.google.dev/
2. [ ] Click "Get API Key"
3. [ ] Create new project or select existing
4. [ ] Copy API key → Save it somewhere safe!

**If you chose OpenAI:**

1. [ ] Go to https://platform.openai.com/
2. [ ] Sign up for account
3. [ ] Add payment method ($5 minimum)
4. [ ] Create API key
5. [ ] Copy and save API key

**If you chose Claude:**

1. [ ] Go to https://www.anthropic.com/
2. [ ] Request API access (may have waitlist)
3. [ ] Create API key once approved

---

## ☑️ Hour 2-3: Infrastructure Setup

### Update Docker Compose

1. [ ] Open `infra/docker-compose.yml`
2. [ ] Add MongoDB service (see QUICK_START_GUIDE.md)
3. [ ] Add Redis service (see QUICK_START_GUIDE.md)
4. [ ] Add volumes for mongo_data and redis_data

**Quick Copy-Paste** (add to docker-compose.yml):

```yaml
mongodb:
  image: mongo:7.0
  container_name: clinicai_mongodb
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: admin
  ports:
    - "27017:27017"
  volumes:
    - mongo_data:/data/db

redis:
  image: redis:7-alpine
  container_name: clinicai_redis
  ports:
    - "6379:6379"
  command: redis-server --requirepass admin
  volumes:
    - redis_data:/data
```

And in volumes section:

```yaml
volumes:
  postgres_data: {}
  keycloak_data: {}
  postgres_fhir_data: {}
  mongo_data: {} # ADD THIS
  redis_data: {} # ADD THIS
```

### Start Infrastructure

```bash
cd infra
docker-compose up -d mongodb redis
```

4. [ ] Run the command above
5. [ ] Wait for services to start (30 seconds)
6. [ ] Verify: `docker-compose ps` shows mongodb and redis running

### Test Connections

**Test MongoDB:**

```bash
docker exec -it clinicai_mongodb mongosh -u admin -p admin
# In mongo shell, type: show dbs
# Then: exit
```

7. [ ] MongoDB connects successfully

**Test Redis:**

```bash
docker exec -it clinicai_redis redis-cli -a admin
# In redis shell, type: PING
# Should respond: PONG
# Then: exit
```

8. [ ] Redis connects successfully

---

## ☑️ Hour 4-6: Backend Service Setup

### Create Project Structure

```bash
cd infra
mkdir chatbot-service
cd chatbot-service
npm init -y
```

9. [ ] Created chatbot-service directory
10. [ ] Initialized npm project

### Install Dependencies

```bash
npm install express cors dotenv socket.io mongoose ioredis
npm install typescript @types/node @types/express @types/cors ts-node nodemon -D
```

**If using Gemini:**

```bash
npm install @google/generative-ai
```

**If using OpenAI:**

```bash
npm install openai
```

**If using Claude:**

```bash
npm install @anthropic-ai/sdk
```

11. [ ] All dependencies installed

### Create tsconfig.json

Create `infra/chatbot-service/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

12. [ ] Created tsconfig.json

### Update package.json Scripts

Edit `package.json`, update the `"scripts"` section:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "echo \"No tests yet\" && exit 0"
  }
}
```

13. [ ] Updated package.json scripts

### Create .env File

Create `infra/chatbot-service/.env`:

**For Gemini:**

```env
NODE_ENV=development
PORT=3001
AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
MONGODB_URI=mongodb://admin:admin@localhost:27017/chatbot?authSource=admin
REDIS_URL=redis://:admin@localhost:6379
FHIR_BASE_URL=http://localhost:8082/fhir
```

**For OpenAI:**

```env
NODE_ENV=development
PORT=3001
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
MONGODB_URI=mongodb://admin:admin@localhost:27017/chatbot?authSource=admin
REDIS_URL=redis://:admin@localhost:6379
FHIR_BASE_URL=http://localhost:8082/fhir
```

14. [ ] Created .env file
15. [ ] Added your actual API key

### Create Basic Server

Create `infra/chatbot-service/src/index.ts`:

```typescript
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:4200",
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "chatbot-service",
    timestamp: new Date().toISOString(),
  });
});

// Basic chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received message:", message);

    // TODO: Send to AI
    const response = `Echo: ${message}`;

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// WebSocket connection
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.emit("connected", {
    message: "Connected to chatbot service",
  });

  socket.on("message", async (data) => {
    console.log("📨 Received:", data);

    // TODO: Process with AI
    socket.emit("response", {
      message: `Echo: ${data.content}`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🤖 Chatbot service running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
```

16. [ ] Created src/index.ts

### Test the Server

```bash
npm run dev
```

17. [ ] Server starts without errors
18. [ ] You see: "Chatbot service running on http://localhost:3001"

**In another terminal:**

```bash
curl http://localhost:3001/health
```

19. [ ] Health check returns JSON with status: "ok"

---

## ☑️ Hour 7-8: Add AI Integration

### Create AI Provider Service

Create `infra/chatbot-service/src/ai-provider.ts`:

**For Gemini:**

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function chatWithAI(message: string, history: any[] = []) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    // System instruction
    const systemPrompt = `You are a helpful medical assistant for a healthcare clinic. 
You help patients with general questions, symptom assessment, and appointment booking.
Be professional, empathetic, and concise.`;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I will be a helpful, professional, and empathetic medical assistant.",
            },
          ],
        },
        ...history,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return { success: true, response };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      success: false,
      response: "Sorry, I encountered an error. Please try again.",
      error: String(error),
    };
  }
}
```

**For OpenAI:**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithAI(message: string, history: any[] = []) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are a helpful medical assistant for a healthcare clinic. 
You help patients with general questions, symptom assessment, and appointment booking.
Be professional, empathetic, and concise.`,
      },
      ...history,
      {
        role: "user",
        content: message,
      },
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return {
      success: true,
      response: response.choices[0].message.content,
    };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      success: false,
      response: "Sorry, I encountered an error. Please try again.",
      error: String(error),
    };
  }
}
```

20. [ ] Created ai-provider.ts

### Update Server to Use AI

Update `infra/chatbot-service/src/index.ts`:

Replace the `// TODO: Send to AI` sections with:

```typescript
import { chatWithAI } from "./ai-provider";

// In the POST /api/chat endpoint:
const aiResult = await chatWithAI(message);
const response = aiResult.success
  ? aiResult.response
  : "Sorry, something went wrong.";

// In the WebSocket message handler:
const aiResult = await chatWithAI(data.content);
socket.emit("response", {
  message: aiResult.response,
  timestamp: new Date().toISOString(),
});
```

21. [ ] Updated index.ts to use AI

### Test AI Integration

Restart your server (Ctrl+C and `npm run dev`)

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, I have a headache"}'
```

22. [ ] AI responds with actual generated text (not echo)

---

## ☑️ Hour 9-12: Simple Web UI for Testing

### Create Test HTML Page

Create `infra/chatbot-service/test-chat.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Chatbot Test</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      .chat-container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 600px;
        height: 700px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        text-align: center;
        font-size: 20px;
        font-weight: bold;
      }
      .status {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 5px;
      }
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .message {
        margin-bottom: 15px;
        display: flex;
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .message.user {
        justify-content: flex-end;
      }
      .message-bubble {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 18px;
        word-wrap: break-word;
      }
      .message.user .message-bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
      .message.assistant .message-bubble {
        background: white;
        color: #333;
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      .input-container {
        padding: 20px;
        background: white;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 10px;
      }
      input {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #e0e0e0;
        border-radius: 25px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.3s;
      }
      input:focus {
        border-color: #667eea;
      }
      button {
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 25px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s;
      }
      button:hover {
        transform: scale(1.05);
      }
      button:active {
        transform: scale(0.95);
      }
      .typing {
        opacity: 0.6;
        font-style: italic;
        font-size: 12px;
        padding: 10px;
      }
    </style>
  </head>
  <body>
    <div class="chat-container">
      <div class="chat-header">
        🤖 AI Medical Assistant
        <div class="status" id="status">Connecting...</div>
      </div>
      <div class="messages" id="messages">
        <div class="message assistant">
          <div class="message-bubble">
            👋 Hello! I'm your AI medical assistant. How can I help you today?
          </div>
        </div>
      </div>
      <div class="input-container">
        <input
          type="text"
          id="messageInput"
          placeholder="Type your message..."
          autocomplete="off"
        />
        <button onclick="sendMessage()">Send</button>
      </div>
    </div>

    <script>
      const socket = io("http://localhost:3001");
      const messagesDiv = document.getElementById("messages");
      const messageInput = document.getElementById("messageInput");
      const statusDiv = document.getElementById("status");

      socket.on("connect", () => {
        console.log("✅ Connected to server");
        statusDiv.textContent = "🟢 Connected";
        statusDiv.style.color = "#4ade80";
      });

      socket.on("disconnect", () => {
        console.log("❌ Disconnected");
        statusDiv.textContent = "🔴 Disconnected";
        statusDiv.style.color = "#f87171";
      });

      socket.on("response", (data) => {
        addMessage(data.message, "assistant");
      });

      function addMessage(text, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${sender}`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.textContent = text;

        messageDiv.appendChild(bubble);
        messagesDiv.appendChild(messageDiv);

        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to UI
        addMessage(message, "user");

        // Send to server
        socket.emit("message", { content: message });

        // Clear input
        messageInput.value = "";
      }

      // Send on Enter key
      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          sendMessage();
        }
      });

      // Focus input on load
      messageInput.focus();
    </script>
  </body>
</html>
```

23. [ ] Created test-chat.html

### Test the Complete Flow

1. [ ] Open `test-chat.html` in your browser
2. [ ] Verify: Shows "🟢 Connected"
3. [ ] Type: "Hello, I have a headache"
4. [ ] Click Send
5. [ ] Verify: AI responds with helpful message

6. [ ] ✅ **WORKING CHATBOT!** 🎉

---

## ☑️ Hour 13-16: Add MongoDB for Chat History

### Create MongoDB Models

Create `infra/chatbot-service/src/models.ts`:

```typescript
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema({
  patientId: { type: String },
  sessionId: { type: String, required: true, unique: true },
  messages: [MessageSchema],
  startTime: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "ended"], default: "active" },
});

export const Conversation = mongoose.model("Conversation", ConversationSchema);

// Connect to MongoDB
export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}
```

25. [ ] Created models.ts

### Update Server to Save History

Update `infra/chatbot-service/src/index.ts`:

Add at the top:

```typescript
import { connectDB, Conversation } from "./models";

// Connect to MongoDB on startup
connectDB();
```

Update WebSocket message handler to save history:

```typescript
socket.on("message", async (data) => {
  const sessionId = data.sessionId || socket.id;

  // Get or create conversation
  let conversation = await Conversation.findOne({ sessionId });
  if (!conversation) {
    conversation = new Conversation({ sessionId, messages: [] });
  }

  // Add user message
  conversation.messages.push({
    role: "user",
    content: data.content,
    timestamp: new Date(),
  });

  // Build history for AI
  const history = conversation.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  // Get AI response
  const aiResult = await chatWithAI(data.content, history);

  // Add assistant message
  conversation.messages.push({
    role: "assistant",
    content: aiResult.response!,
    timestamp: new Date(),
  });

  conversation.lastActivity = new Date();
  await conversation.save();

  socket.emit("response", {
    message: aiResult.response,
    timestamp: new Date().toISOString(),
  });
});
```

26. [ ] Updated server to save chat history
27. [ ] Restart server and test
28. [ ] Chat with AI for 3-4 messages
29. [ ] Verify AI remembers context from previous messages

---

## ☑️ Hour 17-20: Add Redis for Session State

### Create Session Service

Create `infra/chatbot-service/src/session.ts`:

```typescript
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => console.log("✅ Connected to Redis"));

export async function initRedis() {
  await client.connect();
}

export async function setSession(
  sessionId: string,
  data: any,
  ttlSeconds = 1800
) {
  await client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getSession(sessionId: string) {
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string) {
  await client.del(`session:${sessionId}`);
}
```

30. [ ] Created session.ts

### Update Server to Use Sessions

Add to `infra/chatbot-service/src/index.ts`:

```typescript
import { initRedis, setSession, getSession } from "./session";

// Initialize Redis
initRedis();

// Update WebSocket connection handler:
io.on("connection", async (socket) => {
  const sessionId = (socket.handshake.query.sessionId as string) || socket.id;

  // Create or restore session
  let session = await getSession(sessionId);
  if (!session) {
    session = {
      sessionId,
      startTime: new Date().toISOString(),
      messageCount: 0,
    };
  }

  await setSession(sessionId, session);

  socket.emit("connected", {
    sessionId,
    message: "Connected to chatbot service",
  });

  socket.on("message", async (data) => {
    // Update session
    session.messageCount++;
    session.lastActivity = new Date().toISOString();
    await setSession(sessionId, session);

    // ... rest of message handling
  });
});
```

31. [ ] Updated server to use Redis sessions
32. [ ] Restart and test
33. [ ] Verify sessions in Redis:

```bash
docker exec -it clinicai_redis redis-cli -a admin
# In Redis: KEYS session:*
# Should show active sessions
```

---

## ☑️ Hour 21-24: Documentation & Next Steps

### Document What You Built

Create `infra/chatbot-service/README.md`:

````markdown
# AI Chatbot Service

## What's Working

✅ Express server with REST API
✅ WebSocket (Socket.io) for real-time chat
✅ AI integration (Gemini/OpenAI)
✅ MongoDB for conversation history
✅ Redis for session management
✅ Basic test UI

## Running the Service

```bash
npm run dev
```
````

Then open `test-chat.html` in browser.

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - Send chat message

## WebSocket Events

- `message` - Send message to AI
- `response` - Receive AI response
- `connected` - Connection established

## Environment Variables

See `.env` file (copy from `.env.example`)

## Next Steps

1. Add authentication (Keycloak JWT)
2. Build screening agent
3. Create Angular frontend
4. Add FHIR integration
5. Implement triage logic

```

34. [ ] Created chatbot-service README

### Update Main Project README

35. [ ] Update `clinicai/readme.md` with link to AI chatbot docs

---

## 🎉 Completion Checklist

At the end of 24 hours, you should have:

- [x] ✅ Working backend chatbot service
- [x] ✅ AI provider integrated (Gemini or OpenAI)
- [x] ✅ MongoDB storing chat history
- [x] ✅ Redis managing sessions
- [x] ✅ WebSocket real-time communication
- [x] ✅ Test UI for chatting
- [x] ✅ AI remembers conversation context
- [x] ✅ Documentation created

---

## 🚀 What's Next?

You now have a **working foundation**! Here's what to do next:

### Week 2: Angular Frontend
- [ ] Create Angular chat module (see IMPLEMENTATION_TASKS.md)
- [ ] Build chat UI components
- [ ] Integrate with backend WebSocket
- [ ] Add to patient portal

### Week 3: Screening Agent
- [ ] Build symptom collection logic
- [ ] Implement risk scoring
- [ ] Create triage decision engine
- [ ] Integrate with FHIR

### Week 4: Security & Polish
- [ ] Add Keycloak authentication
- [ ] Implement rate limiting
- [ ] Add error handling
- [ ] Security audit

**For detailed tasks**, see [IMPLEMENTATION_TASKS.md](./IMPLEMENTATION_TASKS.md)

---

## 📸 Take a Screenshot!

Before you finish, take a screenshot of:
1. Your test UI with a conversation
2. MongoDB showing saved conversations
3. Redis showing active sessions

You did it! 🎉

---

## 🆘 Troubleshooting

**AI not responding:**
- Check your API key is correct in `.env`
- Check console for error messages
- Verify your API provider account has credits/quota

**Can't connect to MongoDB:**
- Run: `docker ps` - verify container is running
- Check connection string in `.env`
- Test manually: `docker exec -it clinicai_mongodb mongosh -u admin -p admin`

**WebSocket not connecting:**
- Check browser console for errors
- Verify server is running on port 3001
- Check CORS settings in server code

**Server crashes:**
- Check you have all dependencies: `npm install`
- Verify `.env` file exists and has all required variables
- Look at the error message - it usually tells you what's wrong

---

**Need help?** Refer to:
- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
- [AI_CHATBOT_IMPLEMENTATION_PLAN.md](./AI_CHATBOT_IMPLEMENTATION_PLAN.md)

**You got this! 💪**
```
