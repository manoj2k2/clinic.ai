import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clinic.AI Chatbot API',
      version: '1.0.0',
      description: 'AI-powered chatbot and patient screening service for healthcare',
      contact: {
        name: 'Clinic.AI',
        email: 'support@clinic.ai'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.clinic.ai',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from Keycloak'
        }
      },
      schemas: {
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Conversation ID' },
            session_id: { type: 'string', description: 'Session identifier' },
            patient_id: { type: 'string', description: 'Patient FHIR ID' },
            start_time: { type: 'string', format: 'date-time' },
            last_activity: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'ended'] },
            metadata: { type: 'object' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            conversation_id: { type: 'integer' },
            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
            content: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            metadata: { type: 'object' }
          }
        },
        ScreeningSession: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            session_id: { type: 'string' },
            patient_id: { type: 'string' },
            chief_complaint: { type: 'string' },
            symptoms: { type: 'array', items: { type: 'object' } },
            risk_score: { type: 'integer', minimum: 0, maximum: 10 },
            triage_level: {
              type: 'string',
              enum: ['emergency', 'urgent', 'routine', 'self-care']
            },
            recommendations: { type: 'array', items: { type: 'string' } },
            status: {
              type: 'string',
              enum: ['in-progress', 'completed', 'abandoned']
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'chatbot-service' },
            version: { type: 'string', example: '1.0.0' },
            database: { type: 'string', example: 'postgresql' },
            activeSessions: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Service health and status endpoints'
      },
      {
        name: 'Conversations',
        description: 'Chat conversation management'
      },
      {
        name: 'User-Patient Mapping',
        description: 'IAM user to FHIR Patient resource mapping'
      },
      {
        name: 'Screening',
        description: 'Patient screening and triage'
      },
      {
        name: 'Analytics',
        description: 'Usage statistics and analytics'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/index.ts'] // Path to route files
};

export const swaggerSpec = swaggerJsdoc(options);
