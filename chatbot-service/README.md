# AI Chatbot Service

AI-powered chatbot and patient screening service for Clinic.AI, built with Node.js, TypeScript, PostgreSQL, and your choice of **OpenAI** or **Google Gemini**.

## 🚀 Quick Start

### 1. Set up Database

Run the database setup script:

```bash
cd ../
docker exec -i fhirdbserver psql -U admin -d postgres < chatbot-db-setup.sql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required variables:**

**Database:**

- `CHATBOT_DATABASE` - Database name (default: `chatbot`)
- `CHATBOT_DB_HOST` - Should be `localhost`
- `CHATBOT_DB_PORT` - Should be `5432` (or your PostgreSQL port)
- `CHATBOT_DB_USER` - Database user (default: `postgres`)
- `CHATBOT_DB_PASSWORD` - Your postgres password

**AI Provider (choose one):**

- For Gemini: `GEMINI_API_KEY` - Get from https://ai.google.dev/
- For OpenAI: `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `AI_PROVIDER` - Set to `gemini` or `openai` (default: `gemini`)

### 4. Run Development Server

```bash
npm run dev
```

The service will start on `http://localhost:3001`

### 5. Test the Service

Open test-chat.html in your browser (see below to create it).

## 📁 Project Structure

```
chatbot-service/
├── src/
│   ├── index.ts                    # Main server file
│   ├── database.ts                 # PostgreSQL connection
│   ├── ai-provider.ts             # Google Gemini integration
│   ├── models/
│   │   └── conversation.model.ts  # Conversation data model
│   └── services/
│       └── session.service.ts     # Session management
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔌 API Endpoints

### REST API

- `GET /health` - Health check
- `GET /api/conversations/:sessionId` - Get conversation history
- `GET /api/patients/:patientId/conversations` - Get patient's conversations

### WebSocket Events

**Client → Server:**

- `message` - Send chat message
- `typing` - User typing indicator

**Server → Client:**

- `connected` - Connection established
- `response` - AI response
- `typing` - AI typing indicator
- `error` - Error message

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3001/health
```

### WebSocket Test

Create `test-chat.html` (see QUICK_START_GUIDE.md for full code) or use a WebSocket client.

## 🐘 Database Schema

Tables:

- `conversations` - Chat conversations
- `messages` - Individual messages
- `screening_sessions` - Symptom screening data
- `sessions` - User session state

See `../chatbot-db-setup.sql` for complete schema.

## 🤖 AI Provider

This service supports **both OpenAI and Google Gemini** as AI providers. You can choose which one to use via environment variables.

### Using Google Gemini (Default)

Gemini offers a generous free tier and is set as the default provider.

1. Get your API key from https://ai.google.dev/
2. Configure in `.env`:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash  # or gemini-1.5-pro
```

### Using OpenAI

For GPT-4 or GPT-3.5 models:

1. Get your API key from https://platform.openai.com/api-keys
2. Configure in `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o, gpt-4-turbo, gpt-3.5-turbo
```

### Switching Providers

Simply change the `AI_PROVIDER` variable in your `.env` file and restart the service. The service will automatically:

- Load the correct API client
- Use the appropriate API key
- Display the active provider on startup

**Note:** Make sure you have the corresponding API key configured for your chosen provider.

## 📊 Monitoring

View active sessions:

```bash
curl http://localhost:3001/health
```

Database queries:

```sql
-- Active conversations
SELECT * FROM active_conversations;

-- High-risk screenings
SELECT * FROM high_risk_screenings;

-- Daily stats
SELECT * FROM daily_conversation_stats;
```

## 🔒 Security

- [ ] Add authentication middleware (Keycloak JWT)
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker (Optional)

Create `Dockerfile` to containerize the service.

## 📚 Documentation

- [Implementation Plan](../../AI_CHATBOT_IMPLEMENTATION_PLAN.md)
- [PostgreSQL Setup](../../POSTGRESQL_CHATBOT_SETUP.md)
- [Quick Start Guide](../../QUICK_START_GUIDE.md)

## 🆘 Troubleshooting

**Database connection fails:**

- Check PostgreSQL is running: `docker ps | grep fhirdbserver`
- Verify database exists: `docker exec -it fhirdbserver psql -U admin -l`
- Check credentials in `.env`

**AI not responding:**

- Verify API key in `.env`
- Check API quota: https://aistudio.google.com/app/apikey
- Look at server logs for error messages

**Port already in use:**

- Change PORT in `.env` to different value
- Or stop other service using port 3001

## 📝 License

MIT

---

**Built with ❤️ for Clinic.AI**
