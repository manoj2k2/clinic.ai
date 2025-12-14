# AI Chatbot Service

AI-powered chatbot and patient screening service for Clinic.AI, built with Node.js, TypeScript, PostgreSQL, and your choice of **OpenAI** or **Google Gemini**. Includes FHIR integration for healthcare data access and user-patient mapping for secure patient interactions.

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

**FHIR Integration:**

- `FHIR_BASE_URL` - FHIR server URL (default: `http://localhost:8080/fhir`)
- `FHIR_USERNAME` - FHIR server username
- `FHIR_PASSWORD` - FHIR server password

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
│   ├── ai-provider.ts             # AI provider abstraction (OpenAI/Gemini)
│   ├── models/
│   │   └── conversation.model.ts  # Conversation data model
│   └── services/
│       ├── session.service.ts     # Session management
│       ├── fhir-client.service.ts # FHIR integration client
│       ├── test-fhir-client.ts    # FHIR client testing utilities
│       └── fhir-examples.ts       # FHIR integration examples
├── package.json
├── tsconfig.json
├── .env.example
├── test-chat.html                 # WebSocket test client
└── README.md
```

## � MCP Integration (Model Context Protocol)

This service includes **MCP (Model Context Protocol)** integration for enhanced security, standardization, and interoperability in healthcare AI systems.

### What is MCP?

MCP provides a standardized protocol for secure AI model access to external tools and data sources, offering:

- **🔒 Security**: Built-in authorization and audit trails
- **📋 Standardization**: Common interface for healthcare tools
- **🔄 Interoperability**: Works across different healthcare systems
- **📊 Compliance**: HIPAA-compliant data access controls

### MCP Benefits for Healthcare

1. **Enhanced Security**: Every tool call is authorized and logged
2. **Standardized Tools**: Consistent interface for healthcare operations
3. **Multi-System Integration**: Connect to multiple healthcare data sources
4. **Compliance Ready**: Built-in HIPAA compliance features
5. **Scalable Architecture**: Easy to add new healthcare capabilities

### MCP Components

- **`patient-mcp-server.ts`** - MCP server providing secure healthcare tools
- **`mcp-healthcare-integration.ts`** - Integration layer for LangChain agents
- **`MCP_HEALTHCARE_INTEGRATION.md`** - Detailed integration guide

### Running with MCP

```bash
# Start MCP server and chatbot service together
./start-mcp-services.bat

# Or run MCP integration test
node test-mcp-integration.js
```

### MCP Healthcare Tools

The MCP server provides these secure healthcare tools:

#### Core Patient Operations
- **Patient Lookup**: Secure patient demographics access with authorization
- **Appointment Management**: Schedule and manage appointments with availability checking
- **Patient Observations**: Retrieve vital signs, lab results, and clinical observations

#### Clinical Data Recording
- **Symptom Recording**: Record patient-reported symptoms as structured FHIR observations
- **Vital Signs Recording**: Record measurements (temperature, blood pressure, heart rate, etc.)
- **Custom Observations**: Create any type of FHIR observation with validation

#### Clinical Intelligence
- **Symptom Assessment**: AI-powered symptom analysis and triage recommendations
- **Emergency Detection**: Analyze text for medical emergencies and immediate guidance
- **Practitioner Search**: Find available healthcare providers by specialty and location

#### System Operations
- **FHIR Health Check**: Check server connectivity and health status
- **Server Capabilities**: Retrieve supported FHIR resources and operations
- **Audit Logging**: Comprehensive compliance tracking for all operations

All tools include HIPAA-compliant authorization, audit trails, and error handling.

## �🔌 API Endpoints

### REST API

- `GET /health` - Health check
- `GET /api/conversations/:sessionId` - Get conversation history
- `GET /api/patients/:patientId/conversations` - Get patient's conversations
- `GET /api/fhir/patients` - Get FHIR patients (requires user-patient mapping)
- `GET /api/fhir/patients/:id` - Get specific FHIR patient
- `GET /api/fhir/observations?patient=:id` - Get patient observations
- `GET /api/fhir/appointments?patient=:id` - Get patient appointments

### WebSocket Events

**Client → Server:**

- `message` - Send chat message
- `typing` - User typing indicator

**Server → Client:**

- `connected` - Connection established
- `response` - AI response
- `typing` - AI typing indicator
- `error` - Error message

## 🤖 AI Provider Implementation

This service supports **both OpenAI and Google Gemini** as AI providers with automatic switching capability.

### Provider Architecture

The service uses an abstraction layer (`ai-provider.ts`) that allows seamless switching between AI providers:

```typescript
interface AIProvider {
  generateResponse(prompt: string, context?: any): Promise<string>;
  getModelName(): string;
}

class GeminiProvider implements AIProvider {
  // Gemini implementation
}

class OpenAIProvider implements AIProvider {
  // OpenAI implementation
}
```

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

### Provider Features

- **Automatic Fallback**: If primary provider fails, service can fallback to secondary
- **Cost Optimization**: Gemini for cost-effective responses, OpenAI for advanced reasoning
- **Model Flexibility**: Support for multiple models within each provider
- **Rate Limiting**: Built-in rate limiting to prevent API quota exhaustion

## 🏥 FHIR Integration

The service integrates with FHIR (Fast Healthcare Interoperability Resources) servers to access patient data, observations, appointments, and other healthcare information.

### FHIR Client Architecture

The FHIR client (`fhir-client.service.ts`) provides:

- RESTful API access to FHIR resources
- Authentication handling
- Error handling and retries
- Type-safe FHIR resource models

### Configuration

Configure FHIR server connection in `.env`:

```env
FHIR_BASE_URL=http://localhost:8080/fhir
FHIR_USERNAME=your_fhir_username
FHIR_PASSWORD=your_fhir_password
```

### Available FHIR Resources

- **Patient**: Patient demographics and identifiers
- **Observation**: Vital signs, lab results, clinical measurements
- **Appointment**: Scheduled appointments and encounters
- **Practitioner**: Healthcare provider information
- **Organization**: Healthcare facility information

### FHIR API Usage Examples

#### Get Patient Information

```typescript
const patient = await fhirClient.getPatient('12345');
console.log(`Patient: ${patient.name[0].given[0]} ${patient.name[0].family}`);
```

#### Get Patient Observations

```typescript
const observations = await fhirClient.getPatientObservations('12345');
observations.forEach(obs => {
  console.log(`${obs.code.text}: ${obs.valueQuantity.value} ${obs.valueQuantity.unit}`);
});
```

#### Get Patient Appointments

```typescript
const appointments = await fhirClient.getPatientAppointments('12345');
appointments.forEach(apt => {
  console.log(`Appointment: ${apt.start} - ${apt.description}`);
});
```

### FHIR Integration Features

- **Secure Access**: Authenticated access to protected health information
- **Standard Compliance**: Full FHIR R4 compliance
- **Error Handling**: Comprehensive error handling for network issues and invalid responses
- **Caching**: Optional caching layer for frequently accessed data
- **Audit Logging**: Request/response logging for compliance

## 👥 User-Patient Mapping

The service implements a secure user-patient mapping system to ensure users can only access their authorized patient data.

### Database Schema

```sql
CREATE TABLE user_patient_mapping (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(50), -- 'self', 'guardian', 'proxy', etc.
  authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  authorized_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB, -- granular permissions
  UNIQUE(user_id, patient_id)
);
```

### Mapping Features

- **Relationship Types**: Self, guardian, family member, healthcare proxy
- **Granular Permissions**: Read/write access to specific data types
- **Audit Trail**: Complete authorization history
- **Access Control**: Runtime permission checking

### API Integration

All FHIR data access is filtered through user-patient mapping:

```typescript
// Check if user can access patient data
const canAccess = await checkUserPatientAccess(userId, patientId);

// Get authorized patients for user
const authorizedPatients = await getAuthorizedPatients(userId);
```

### Security Considerations

- **Authorization Checks**: Every FHIR request validates user permissions
- **Data Isolation**: Users can only see their mapped patients
- **Audit Logging**: All access attempts are logged
- **Consent Management**: Integration with consent management systems

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3001/health
```

### WebSocket Test

Create `test-chat.html` (see QUICK_START_GUIDE.md for full code) or use a WebSocket client.

### FHIR Client Testing

Test FHIR integration with the test utilities:

```typescript
import { testFHIRConnection, testPatientRetrieval } from './src/services/test-fhir-client';

// Test basic connectivity
await testFHIRConnection();

// Test patient data retrieval
await testPatientRetrieval('test-patient-id');
```

## 🐘 Database Schema

Tables:

- `conversations` - Chat conversations
- `messages` - Individual messages
- `screening_sessions` - Symptom screening data
- `sessions` - User session state
- `user_patient_mapping` - User to patient relationships

See `../chatbot-db-setup.sql` for complete schema.

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

-- User-patient mappings
SELECT user_id, patient_id, relationship_type FROM user_patient_mapping WHERE is_active = true;
```

## 🔒 Security

- [x] User-patient mapping for data access control
- [x] FHIR authentication and authorization
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

**FHIR connection fails:**

- Verify FHIR server is running: `curl http://localhost:8080/fhir/metadata`
- Check FHIR credentials in `.env`
- Test with: `curl -u username:password http://localhost:8080/fhir/Patient`

**Port already in use:**

- Change PORT in `.env` to different value
- Or stop other service using port 3001

## 📝 Recent Updates

### Service Refactoring (Completed)

- **Modular Architecture**: Separated concerns into distinct service modules
- **Type Safety**: Enhanced TypeScript usage throughout the codebase
- **Error Handling**: Improved error handling and logging
- **Configuration Management**: Centralized configuration with environment variables
- **Testing Infrastructure**: Added comprehensive testing utilities

### FHIR Integration (Task 1.13 - Completed)

- ✅ FHIR client service implementation
- ✅ Patient data retrieval and mapping
- ✅ Observation and appointment integration
- ✅ Authentication and error handling
- ✅ User-patient mapping security layer
- ✅ Comprehensive testing and validation

## 📝 License

MIT

---

**Built with ❤️ for Clinic.AI**</content>
<parameter name="filePath">c:\Users\aryan\source\repos\clinicai\chatbot-service\README.md
