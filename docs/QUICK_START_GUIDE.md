# 🚀 Quick Start Guide: AI Chatbot Implementation

## Overview

This guide will help you quickly set up the development environment and start building the AI chatbot and screening agent system.

---

## 🎯 What We're Building

**3 Main Components:**

1. **Stateful AI Chatbot** - Conversational interface for patients
2. **Screening Agent** - Intelligent symptom assessment and triage
3. **Integration Layer** - Orchestrates both agents and connects to FHIR

---

## 📋 Prerequisites

### Required Tools

- [x] Node.js 18+ (check: `node --version`)
- [x] Docker & Docker Compose (already in use)
- [ ] MongoDB (will add to docker-compose)
- [ ] Redis (will add to docker-compose)

### Required Accounts & API Keys

Choose ONE AI provider to start:

**Option A: OpenAI (Recommended for getting started)**

- Sign up at: https://platform.openai.com/
- Create API key
- Models to use: `gpt-4-turbo-preview` or `gpt-3.5-turbo`
- Cost: ~$0.01-0.03 per conversation

**Option B: Google Gemini**

- Sign up at: https://ai.google.dev/
- Create API key
- Model to use: `gemini-pro`
- Cost: Free tier available, then usage-based

**Option C: Anthropic Claude**

- Sign up at: https://www.anthropic.com/
- Create API key
- Model to use: `claude-3-sonnet`

---

## 🏗️ Step-by-Step Setup

### Step 1: Extend Docker Compose

Add MongoDB and Redis to your existing `docker-compose.yml`:

```yaml
# Add these services to infra/docker-compose.yml

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

# Add to volumes section:
volumes:
  postgres_data: {}
  keycloak_data: {}
  postgres_fhir_data: {}
  mongo_data: {}
  redis_data: {}
```

Start the new services:

```bash
cd infra
docker-compose up -d mongodb redis
```

### Step 2: Create Chatbot Service

Create the backend service directory:

```bash
cd infra
mkdir -p chatbot-service/src
cd chatbot-service
```

Initialize Node.js project:

```bash
npm init -y
```

Install core dependencies:

```bash
npm install express cors dotenv socket.io mongoose ioredis
npm install openai  # or @google/generative-ai for Gemini
npm install typescript @types/node @types/express ts-node nodemon -D
```

### Step 3: Create Basic Server

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
    origin: "http://localhost:4200", // Your Angular app
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "chatbot-service" });
});

// WebSocket connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("message", async (data) => {
    console.log("Received message:", data);
    // TODO: Process with AI
    socket.emit("response", {
      message: "Echo: " + data.content,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🤖 Chatbot service running on port ${PORT}`);
});
```

Create `.env` file:

```env
PORT=3001
OPENAI_API_KEY=your_api_key_here
MONGODB_URI=mongodb://admin:admin@localhost:27017/chatbot?authSource=admin
REDIS_URL=redis://:admin@localhost:6379
FHIR_BASE_URL=http://localhost:8082/fhir
```

Create `tsconfig.json`:

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

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Run the service:

```bash
npm run dev
```

### Step 4: Create Angular Chat Module

In your Angular FE directory:

```bash
cd FE/src/app
mkdir -p chat/components chat/services chat/models
```

Create chat module:

```bash
# This will be done via Angular CLI or manually
# ng generate module chat --routing
```

### Step 5: Test Basic Connection

Create a simple test HTML file to verify the WebSocket connection:

```html
<!-- infra/chatbot-service/test.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Chat Test</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  </head>
  <body>
    <h1>Chatbot Test</h1>
    <input type="text" id="messageInput" placeholder="Type a message..." />
    <button onclick="sendMessage()">Send</button>
    <div id="messages"></div>

    <script>
      const socket = io("http://localhost:3001");

      socket.on("connect", () => {
        console.log("Connected to chatbot service");
        document.getElementById("messages").innerHTML += "<p>✅ Connected</p>";
      });

      socket.on("response", (data) => {
        document.getElementById(
          "messages"
        ).innerHTML += `<p>🤖 ${data.message}</p>`;
      });

      function sendMessage() {
        const input = document.getElementById("messageInput");
        const message = input.value;
        socket.emit("message", { content: message });
        document.getElementById("messages").innerHTML += `<p>👤 ${message}</p>`;
        input.value = "";
      }
    </script>
  </body>
</html>
```

Open `test.html` in a browser to verify the connection works.

---

## 🧪 Testing Your Setup

### 1. Check all services are running:

```bash
# In infra directory
docker-compose ps
```

You should see:

- ✅ hapi_fhir_server
- ✅ fhirdbserver
- ✅ keycloak_server
- ✅ clinicai_mongodb
- ✅ clinicai_redis

### 2. Test MongoDB connection:

```bash
# Connect to MongoDB
docker exec -it clinicai_mongodb mongosh -u admin -p admin

# In MongoDB shell
show dbs
use chatbot
db.test.insertOne({ message: "Hello" })
db.test.find()
exit
```

### 3. Test Redis connection:

```bash
# Connect to Redis
docker exec -it clinicai_redis redis-cli -a admin

# In Redis CLI
PING
SET test "Hello Redis"
GET test
exit
```

### 4. Test chatbot service:

```bash
curl http://localhost:3001/health
```

Expected response: `{"status":"ok","service":"chatbot-service"}`

---

## 📁 Expected Directory Structure

After setup, you should have:

```
clinicai/
├── FE/                          # Existing Angular app
│   └── src/
│       └── app/
│           └── chat/            # NEW: Chat module
│               ├── components/
│               ├── services/
│               └── models/
├── infra/
│   ├── docker-compose.yml       # UPDATED: +MongoDB +Redis
│   └── chatbot-service/         # NEW: Backend service
│       ├── src/
│       │   ├── index.ts
│       │   ├── config/
│       │   ├── services/
│       │   ├── ai/
│       │   ├── agents/
│       │   └── routes/
│       ├── package.json
│       ├── tsconfig.json
│       └── .env
└── AI_CHATBOT_IMPLEMENTATION_PLAN.md  # Full plan
```

---

## 🎓 Next Development Steps

Once basic setup is complete:

### Week 1 Tasks:

1. ✅ Set up infrastructure (MongoDB, Redis)
2. ✅ Create basic chatbot service
3. [ ] Integrate OpenAI/Gemini API
4. [ ] Implement conversation state management
5. [ ] Create chat API endpoints

### Week 2 Tasks:

1. [ ] Build Angular chat UI components
2. [ ] Implement WebSocket service in Angular
3. [ ] Create chat container component
4. [ ] Add to patient portal dashboard
5. [ ] Style with PrimeNG

**👉 Ready to start? Pick Week 1, Task 3 as your next step!**

---

## 🔧 Troubleshooting

### Docker services not starting

```bash
docker-compose down
docker-compose up -d
docker-compose logs -f
```

### Cannot connect to MongoDB

- Check if port 27017 is already in use
- Verify credentials in connection string
- Check MongoDB container logs: `docker logs clinicai_mongodb`

### Cannot connect to Redis

- Check if port 6379 is already in use
- Verify password in connection string
- Check Redis container logs: `docker logs clinicai_redis`

### Chatbot service crashes

- Check .env file has all required variables
- Verify API key is valid
- Check logs for specific error messages

---

## 📚 Useful Commands

```bash
# Start all infrastructure
cd infra && docker-compose up -d

# Start Angular dev server
cd FE && npm run start

# Start chatbot service
cd infra/chatbot-service && npm run dev

# View logs
docker-compose logs -f mongodb
docker-compose logs -f redis

# Stop all services
docker-compose down

# Reset everything (⚠️ deletes data)
docker-compose down -v
```

---

## 💡 Pro Tips

1. **Use a .env file template**: Create `.env.example` with dummy values for team members
2. **Version control**: Add `.env` to `.gitignore` (API keys should never be committed)
3. **Development workflow**: Run infra services via Docker, run chatbot service locally for faster iteration
4. **Postman/Insomnia**: Create a collection for testing API endpoints
5. **Logging**: Use structured logging from day 1 (winston or pino)

---

## 🆘 Need Help?

Refer to the full implementation plan in `AI_CHATBOT_IMPLEMENTATION_PLAN.md` for:

- Detailed architecture diagrams
- Complete code examples
- Security considerations
- Testing strategies
- Deployment guidelines

---

**Ready to build something amazing! 🚀**
