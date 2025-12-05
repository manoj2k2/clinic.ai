# 🐘 AI Chatbot with PostgreSQL (Instead of MongoDB)

## Why PostgreSQL is Great for This Project

✅ **Already running** - You have PostgreSQL for FHIR data
✅ **JSONB support** - Flexible schema like MongoDB
✅ **Better performance** - For relational queries
✅ **Simpler infrastructure** - One database instead of two
✅ **ACID compliance** - Stronger data consistency

---

## Database Schema Design

### Option 1: Separate Database (Recommended)

Create a separate database for chatbot data alongside your FHIR database:

- `hapi02` - FHIR data (existing)
- `chatbot` - Chat conversations and screening data (new)

### Option 2: Same Database, Different Schema

Use PostgreSQL schemas to separate concerns:

- `public` schema - FHIR data
- `chatbot` schema - Chat data

**We'll use Option 1 for clarity.**

---

## 📋 Step-by-Step Setup

### Step 1: Create Chatbot Database

Connect to your existing PostgreSQL server:

```bash
# Using Docker to access postgres
docker exec -it fhirdbserver psql -U admin -d postgres
```

In the PostgreSQL prompt:

```sql
-- Create chatbot database
CREATE DATABASE chatbot;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE chatbot TO admin;

-- Exit
\q
```

### Step 2: Connect to Chatbot Database

```bash
docker exec -it fhirdbserver psql -U admin -d chatbot
```

### Step 3: Create Tables

```sql
-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    patient_id VARCHAR(255),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screening sessions table
CREATE TABLE screening_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    conversation_id INTEGER REFERENCES conversations(id),
    patient_id VARCHAR(255) NOT NULL,
    chief_complaint TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb,
    risk_score INTEGER,
    triage_level VARCHAR(50) CHECK (triage_level IN ('emergency', 'urgent', 'routine', 'self-care')),
    recommendations JSONB DEFAULT '[]'::jsonb,
    fhir_resources JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'in-progress',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    reviewed_by VARCHAR(255),
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for Redis replacement)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_patient_id ON conversations(patient_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_screening_sessions_patient_id ON screening_sessions(patient_id);
CREATE INDEX idx_screening_sessions_status ON screening_sessions(status);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screening_sessions_updated_at
    BEFORE UPDATE ON screening_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Verify tables created
\dt
```

---

## 🔧 Updated Environment Variables

Update your `.env` file:

```env
# PostgreSQL Configuration (Single database for everything)
POSTGRES_HOST=localhost
POSTGRES_PORT=5430
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin

# FHIR Database (existing)
FHIR_DATABASE=hapi02

# Chatbot Database (new)
CHATBOT_DATABASE=chatbot

# Connection strings
FHIR_DB_URL=postgresql://admin:admin@localhost:5430/hapi02
CHATBOT_DB_URL=postgresql://admin:admin@localhost:5430/chatbot

# Redis (Optional - can use PostgreSQL sessions table instead)
REDIS_ENABLED=false
# REDIS_URL=redis://:admin@localhost:6379
```

---

## 💻 Code Implementation

### Install PostgreSQL Client for Node.js

```bash
cd infra/chatbot-service
npm install pg
npm install --save-dev @types/pg
```

### Database Connection Service

Create `infra/chatbot-service/src/database.ts`:

```typescript
import { Pool } from "pg";

// Connection pool for chatbot database
export const chatbotPool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5430"),
  user: process.env.POSTGRES_USER || "admin",
  password: process.env.POSTGRES_PASSWORD || "admin",
  database: process.env.CHATBOT_DATABASE || "chatbot",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection pool for FHIR database (if needed)
export const fhirPool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5430"),
  user: process.env.POSTGRES_USER || "admin",
  password: process.env.POSTGRES_PASSWORD || "admin",
  database: process.env.FHIR_DATABASE || "hapi02",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
export async function testConnection() {
  try {
    const client = await chatbotPool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("✅ Connected to PostgreSQL (chatbot):", result.rows[0].now);
    client.release();
  } catch (error) {
    console.error("❌ PostgreSQL connection error:", error);
    throw error;
  }
}

// Cleanup on shutdown
process.on("SIGTERM", async () => {
  await chatbotPool.end();
  await fhirPool.end();
});
```

### Models with PostgreSQL

Create `infra/chatbot-service/src/models/conversation.model.ts`:

```typescript
import { chatbotPool } from "../database";

export interface Conversation {
  id?: number;
  session_id: string;
  patient_id?: string;
  start_time?: Date;
  last_activity?: Date;
  status?: "active" | "ended";
  metadata?: any;
}

export interface Message {
  id?: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
  timestamp?: Date;
}

export class ConversationModel {
  // Create new conversation
  static async create(
    sessionId: string,
    patientId?: string
  ): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (session_id, patient_id, status)
      VALUES ($1, $2, 'active')
      RETURNING *
    `;
    const result = await chatbotPool.query(query, [sessionId, patientId]);
    return result.rows[0];
  }

  // Find conversation by session ID
  static async findBySessionId(
    sessionId: string
  ): Promise<Conversation | null> {
    const query = "SELECT * FROM conversations WHERE session_id = $1";
    const result = await chatbotPool.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  // Get conversation with messages
  static async getWithMessages(sessionId: string): Promise<{
    conversation: Conversation;
    messages: Message[];
  } | null> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) return null;

    const messagesQuery = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY timestamp ASC
    `;
    const messagesResult = await chatbotPool.query(messagesQuery, [
      conversation.id,
    ]);

    return {
      conversation,
      messages: messagesResult.rows,
    };
  }

  // Add message to conversation
  static async addMessage(
    conversationId: number,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: any
  ): Promise<Message> {
    const client = await chatbotPool.connect();
    try {
      await client.query("BEGIN");

      // Insert message
      const messageQuery = `
        INSERT INTO messages (conversation_id, role, content, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const messageResult = await client.query(messageQuery, [
        conversationId,
        role,
        content,
        metadata || {},
      ]);

      // Update conversation last_activity
      const updateQuery = `
        UPDATE conversations 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      await client.query(updateQuery, [conversationId]);

      await client.query("COMMIT");
      return messageResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Update conversation status
  static async updateStatus(
    sessionId: string,
    status: "active" | "ended"
  ): Promise<void> {
    const query = `
      UPDATE conversations 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE session_id = $2
    `;
    await chatbotPool.query(query, [status, sessionId]);
  }

  // Get conversation history for patient
  static async getPatientHistory(
    patientId: string,
    limit = 10
  ): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations 
      WHERE patient_id = $1 
      ORDER BY start_time DESC 
      LIMIT $2
    `;
    const result = await chatbotPool.query(query, [patientId, limit]);
    return result.rows;
  }
}
```

### Session Service (PostgreSQL instead of Redis)

Create `infra/chatbot-service/src/services/session.service.ts`:

```typescript
import { chatbotPool } from "../database";

export interface SessionData {
  sessionId: string;
  patientId?: string;
  startTime: string;
  messageCount: number;
  lastActivity: string;
  context?: any;
}

export class SessionService {
  // Create or update session
  static async set(
    sessionId: string,
    data: SessionData,
    ttlSeconds = 1800
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const query = `
      INSERT INTO sessions (session_id, data, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        data = $2, 
        expires_at = $3, 
        updated_at = CURRENT_TIMESTAMP
    `;

    await chatbotPool.query(query, [
      sessionId,
      JSON.stringify(data),
      expiresAt,
    ]);
  }

  // Get session
  static async get(sessionId: string): Promise<SessionData | null> {
    // Clean up expired sessions first
    await this.cleanup();

    const query = `
      SELECT data FROM sessions 
      WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP
    `;
    const result = await chatbotPool.query(query, [sessionId]);

    if (result.rows.length === 0) return null;

    return result.rows[0].data;
  }

  // Delete session
  static async delete(sessionId: string): Promise<void> {
    const query = "DELETE FROM sessions WHERE session_id = $1";
    await chatbotPool.query(query, [sessionId]);
  }

  // Cleanup expired sessions
  static async cleanup(): Promise<void> {
    const query = "DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP";
    await chatbotPool.query(query);
  }

  // Get active sessions count
  static async getActiveCount(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE expires_at > CURRENT_TIMESTAMP
    `;
    const result = await chatbotPool.query(query);
    return parseInt(result.rows[0].count);
  }
}

// Schedule cleanup every 5 minutes
setInterval(() => {
  SessionService.cleanup().catch(console.error);
}, 5 * 60 * 1000);
```

### Screening Model

Create `infra/chatbot-service/src/models/screening.model.ts`:

```typescript
import { chatbotPool } from "../database";

export interface ScreeningSession {
  id?: number;
  session_id: string;
  conversation_id?: number;
  patient_id: string;
  chief_complaint?: string;
  symptoms?: any[];
  risk_score?: number;
  triage_level?: "emergency" | "urgent" | "routine" | "self-care";
  recommendations?: string[];
  fhir_resources?: any;
  status?: "in-progress" | "completed" | "abandoned";
  start_time?: Date;
  end_time?: Date;
}

export class ScreeningModel {
  // Create screening session
  static async create(
    sessionId: string,
    patientId: string,
    conversationId?: number
  ): Promise<ScreeningSession> {
    const query = `
      INSERT INTO screening_sessions (session_id, patient_id, conversation_id, status)
      VALUES ($1, $2, $3, 'in-progress')
      RETURNING *
    `;
    const result = await chatbotPool.query(query, [
      sessionId,
      patientId,
      conversationId,
    ]);
    return result.rows[0];
  }

  // Update screening data
  static async update(
    sessionId: string,
    data: Partial<ScreeningSession>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.chief_complaint !== undefined) {
      fields.push(`chief_complaint = $${paramCount++}`);
      values.push(data.chief_complaint);
    }
    if (data.symptoms !== undefined) {
      fields.push(`symptoms = $${paramCount++}`);
      values.push(JSON.stringify(data.symptoms));
    }
    if (data.risk_score !== undefined) {
      fields.push(`risk_score = $${paramCount++}`);
      values.push(data.risk_score);
    }
    if (data.triage_level !== undefined) {
      fields.push(`triage_level = $${paramCount++}`);
      values.push(data.triage_level);
    }
    if (data.recommendations !== undefined) {
      fields.push(`recommendations = $${paramCount++}`);
      values.push(JSON.stringify(data.recommendations));
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.fhir_resources !== undefined) {
      fields.push(`fhir_resources = $${paramCount++}`);
      values.push(JSON.stringify(data.fhir_resources));
    }

    if (fields.length === 0) return;

    values.push(sessionId);
    const query = `
      UPDATE screening_sessions 
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $${paramCount}
    `;

    await chatbotPool.query(query, values);
  }

  // Get screening by session ID
  static async findBySessionId(
    sessionId: string
  ): Promise<ScreeningSession | null> {
    const query = "SELECT * FROM screening_sessions WHERE session_id = $1";
    const result = await chatbotPool.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  // Complete screening
  static async complete(
    sessionId: string,
    triageLevel: string,
    recommendations: string[]
  ): Promise<void> {
    const query = `
      UPDATE screening_sessions 
      SET status = 'completed', 
          triage_level = $2,
          recommendations = $3,
          end_time = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `;
    await chatbotPool.query(query, [
      sessionId,
      triageLevel,
      JSON.stringify(recommendations),
    ]);
  }

  // Get high-risk screenings for practitioner review
  static async getHighRiskScreenings(limit = 20): Promise<ScreeningSession[]> {
    const query = `
      SELECT * FROM screening_sessions 
      WHERE triage_level IN ('emergency', 'urgent') 
        AND reviewed_by IS NULL
      ORDER BY start_time DESC
      LIMIT $1
    `;
    const result = await chatbotPool.query(query, [limit]);
    return result.rows;
  }
}
```

---

## 🔄 Updated Server Code

Update `infra/chatbot-service/src/index.ts`:

```typescript
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { testConnection } from "./database";
import { ConversationModel } from "./models/conversation.model";
import { SessionService } from "./services/session.service";
import { chatWithAI } from "./ai-provider";

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

// Test database connection on startup
testConnection().catch(console.error);

// Health check
app.get("/health", async (req, res) => {
  const activeSessionsCount = await SessionService.getActiveCount();
  res.json({
    status: "ok",
    service: "chatbot-service",
    database: "postgresql",
    activeSessions: activeSessionsCount,
    timestamp: new Date().toISOString(),
  });
});

// WebSocket connection
io.on("connection", async (socket) => {
  const sessionId = (socket.handshake.query.sessionId as string) || socket.id;
  console.log("✅ Client connected:", sessionId);

  // Get or create session
  let session = await SessionService.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      startTime: new Date().toISOString(),
      messageCount: 0,
      lastActivity: new Date().toISOString(),
    };
    await SessionService.set(sessionId, session);
  }

  // Get or create conversation
  let conversationData = await ConversationModel.findBySessionId(sessionId);
  if (!conversationData) {
    conversationData = await ConversationModel.create(sessionId);
  }

  socket.emit("connected", {
    sessionId,
    message: "Connected to chatbot service",
  });

  socket.on("message", async (data) => {
    try {
      console.log("📨 Received:", data);

      // Add user message to database
      await ConversationModel.addMessage(
        conversationData!.id!,
        "user",
        data.content
      );

      // Get conversation history
      const history = await ConversationModel.getWithMessages(sessionId);
      const aiHistory = history!.messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      // Get AI response
      const aiResult = await chatWithAI(data.content, aiHistory);

      // Save AI response to database
      await ConversationModel.addMessage(
        conversationData!.id!,
        "assistant",
        aiResult.response || "Sorry, I encountered an error."
      );

      // Update session
      session!.messageCount++;
      session!.lastActivity = new Date().toISOString();
      await SessionService.set(sessionId, session!);

      // Send response
      socket.emit("response", {
        message: aiResult.response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error processing message:", error);
      socket.emit("error", { message: "Failed to process message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", sessionId);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🤖 Chatbot service running on http://localhost:${PORT}`);
  console.log(`🐘 Using PostgreSQL for all data`);
  console.log(`📡 WebSocket server ready`);
});
```

---

## 📊 Advantages of PostgreSQL Approach

| Feature                | MongoDB                 | PostgreSQL             |
| ---------------------- | ----------------------- | ---------------------- |
| **Infrastructure**     | Need separate service   | Already running        |
| **Schema flexibility** | JSON documents          | JSONB columns          |
| **Relationships**      | Manual references       | Foreign keys           |
| **Transactions**       | Limited                 | Full ACID              |
| **Queries**            | MongoDB query language  | SQL                    |
| **Performance**        | Fast for simple queries | Fast for complex joins |
| **Learning curve**     | New syntax              | Familiar SQL           |
| **Backup**             | Separate backup         | Single backup          |

---

## 🎯 What You Gain

1. **Simpler infrastructure** - One database instead of two
2. **Better data integrity** - Foreign keys, constraints
3. **Easier backups** - Single database to backup
4. **Powerful queries** - SQL joins between chat and FHIR data
5. **Cost savings** - No MongoDB Atlas subscription needed
6. **Familiar tools** - pgAdmin already in your stack

---

## ✅ Updated Quick Start Checklist

**Instead of adding MongoDB:**

1. ✅ Connect to existing PostgreSQL
2. ✅ Create `chatbot` database
3. ✅ Run schema creation SQL
4. ✅ Update `.env` with PostgreSQL connection
5. ✅ Install `pg` npm package
6. ✅ Use PostgreSQL models
7. ✅ Test queries

**No MongoDB or Redis needed!** 🎉

---

## 🔍 Querying Examples

### Get all conversations for a patient

```sql
SELECT c.*, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.patient_id = 'patient-123'
GROUP BY c.id
ORDER BY c.start_time DESC;
```

### Get screening sessions with high risk

```sql
SELECT s.*, c.session_id, c.patient_id
FROM screening_sessions s
JOIN conversations c ON c.id = s.conversation_id
WHERE s.triage_level IN ('emergency', 'urgent')
  AND s.reviewed_by IS NULL
ORDER BY s.start_time DESC;
```

### Analytics: Average conversation length

```sql
SELECT
  DATE(start_time) as date,
  COUNT(*) as conversations,
  AVG(message_count) as avg_messages
FROM (
  SELECT c.id, c.start_time, COUNT(m.id) as message_count
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  GROUP BY c.id
) subq
GROUP BY DATE(start_time)
ORDER BY date DESC;
```

---

## 🚀 Next Steps

1. Create the `chatbot` database in PostgreSQL
2. Run the schema SQL
3. Update your `.env` file
4. Install `pg` package
5. Use the PostgreSQL models provided above
6. Test with the updated server code

**You're all set!** PostgreSQL is perfect for this use case. 🐘✨
