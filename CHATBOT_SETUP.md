# Chatbot Setup - Quick Start Guide

## Prerequisites

- Docker & Docker Compose running
- Node.js 16+ (for chatbot-service)
- npm (for chatbot-service)

## Step 1: Start Docker Services

```bash
cd infra
docker-compose up -d --build
```

This will start:
- HAPI FHIR Server (port 8082)
- FHIR Database (port 5430)
- Keycloak (port 8081)
- Keycloak Database (port 5432)
- **Chatbot Database - postgres_chatdb (port 5433)** ← NEW

Verify containers are running:
```bash
docker ps | findstr -E "hapi|fhir|keycloak|chatdb"
```

## Step 2: Run Database Migrations

The migration runs automatically when `postgres_chatdb` container starts (via init scripts), but you can also run manually:

```powershell
# From infra directory
docker exec -i postgres_chatdb psql -U chatuser -d chatdb -f .\migrations\001_user_patient_mapping.sql
```

Or use the setup script:
```powershell
cd infra
.\setup-chatbot.ps1
```

Verify table was created:
```bash
docker exec -i postgres_chatdb psql -U chatuser -d chatdb -c "\dt"
```

You should see:
```
           List of relations
 Schema |        Name        | Type  | Owner
--------+--------------------+-------+---------
 public | user_patient_mapping | table | chatuser
```

## Step 3: Setup Chatbot Service

```bash
cd chatbot-service

# Copy .env template
cp .env.example .env

# Install dependencies
npm install
```

## Step 4: Configure .env

Edit `chatbot-service/.env`:

```dotenv
# Database (should match docker-compose)
CHATBOT_DATABASE=chatdb
CHATBOT_DB_USER=chatuser
CHATBOT_DB_PASSWORD=chatpass123
CHATBOT_DB_HOST=postgres_chatdb
CHATBOT_DB_PORT=5432

# AI Provider
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_key_here

# WebSocket CORS
WEBSOCKET_CORS_ORIGIN=http://localhost:4200
```

Get Gemini API key: https://ai.google.dev/

## Step 5: Run Chatbot Service

```bash
cd chatbot-service

# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

You should see:
```
🚀 Starting Chatbot Service...
✅ Database test successful
✅ AI provider test successful
✅ FHIR server connected
✅ All systems ready!
```

## Step 6: Run Frontend

In another terminal:

```bash
cd FE

# Install dependencies
npm install --force

# Start dev server
npm start

# Or using ng directly
ng serve --port 4200
```

Open browser: http://localhost:4200

## Step 7: Test the Chatbot

1. **Log into portal** via Keycloak (http://localhost:8081)
2. **Create a patient** in portal (`/patients` → Create)
3. **View mapping in database**:
   ```bash
   docker exec -i postgres_chatdb psql -U chatuser -d chatdb -c "SELECT * FROM user_patient_mapping"
   ```
4. **Open chatbot** at http://localhost:4200/chatbot
5. Should see patient dropdown with your created patient

## Database Connection Details

| Property | Value |
|----------|-------|
| Container | postgres_chatdb |
| Host (Docker) | postgres_chatdb:5433 |
| Host (Local) | localhost:5433 |
| Database | chatdb |
| User | chatuser |
| Password | chatpass123 |

## Troubleshooting

### "Connection refused" error

```bash
# Check if postgres_chatdb is running
docker ps | findstr postgres_chatdb

# If not, restart it
docker-compose -f infra/docker-compose.yml up -d postgres_chatdb
```

### "Database does not exist" error

```bash
# Manually run migration
docker exec -i postgres_chatdb psql -U chatuser -d chatdb \
  -c "CREATE TABLE IF NOT EXISTS user_patient_mapping (
    id SERIAL PRIMARY KEY,
    iam_user_id VARCHAR(255) NOT NULL,
    fhir_patient_id VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(iam_user_id, fhir_patient_id)
  );"
```

### "Chatbot won't connect" error

1. Check backend is running: http://localhost:3001/health
2. Check frontend can reach backend (CORS enabled)
3. Check authentication token is valid

## API Endpoints Reference

### User-Patient Mapping

```bash
# Get all patients for user
curl http://localhost:3001/api/users/{userId}/patients

# Get primary patient
curl http://localhost:3001/api/users/{userId}/patients/primary

# Add patient mapping
curl -X POST http://localhost:3001/api/users/{userId}/patients \
  -H "Content-Type: application/json" \
  -d '{"patientId": "patient-123", "isPrimary": true}'

# Set as primary
curl -X PUT http://localhost:3001/api/users/{userId}/patients/{patientId}/primary

# Check access
curl http://localhost:3001/api/users/{userId}/patients/{patientId}/access

# Remove patient
curl -X DELETE http://localhost:3001/api/users/{userId}/patients/{patientId}
```

## Useful Commands

```bash
# View chatbot service logs
docker-compose -f infra/docker-compose.yml logs -f postgres_chatdb

# Connect to database directly
docker exec -it postgres_chatdb psql -U chatuser -d chatdb

# View all user-patient mappings
docker exec -i postgres_chatdb psql -U chatuser -d chatdb \
  -c "SELECT * FROM user_patient_mapping;"

# Delete all mappings for testing
docker exec -i postgres_chatdb psql -U chatuser -d chatdb \
  -c "DELETE FROM user_patient_mapping;"
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (4200)                      │
│                   Angular + Socket.io                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓ HTTP + WebSocket
┌─────────────────────────────────────────────────────────┐
│              Chatbot Service (3001)                     │
│          Express + Socket.io + OpenAI/Gemini           │
└──────────┬─────────────────────────────────┬────────────┘
           │ SQL Queries                     │ FHIR API
           ↓                                  ↓
    ┌──────────────────┐           ┌─────────────────────┐
    │ postgres_chatdb  │           │  HAPI FHIR Server   │
    │ (port 5433)      │           │  (port 8082)        │
    │                  │           └─────────────────────┘
    │ - Conversations  │
    │ - Sessions       │           ┌─────────────────────┐
    │ - User-Patient   │           │  Keycloak (8081)    │
    │   Mappings       │           └─────────────────────┘
    └──────────────────┘
```

## Next Steps

1. ✅ Setup database and services
2. ✅ Configure environment variables
3. ✅ Run chatbot service
4. ✅ Run frontend
5. 📋 Create test patient
6. 📋 Open chatbot and test
7. 📋 Monitor logs for errors
