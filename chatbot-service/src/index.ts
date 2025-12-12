import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { testConnection } from './database';
import { testAI } from './ai-provider';
import { swaggerSpec } from './config/swagger.config';
import { 
  errorHandler, 
  notFoundHandler 
} from './middleware/error.middleware';
import { 
  requestLogger, 
  corsMiddleware,
  validateContentType 
} from './middleware/logger.middleware';
import { setupWebSocketHandlers } from './websocket/socket.handler';

// Import routes
import healthRoutes from './routes/health.routes';
import conversationRoutes from './routes/conversation.routes';
import userPatientRoutes from './routes/user-patient.routes';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN || 'http://localhost:4200',
    credentials: true
  }
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(validateContentType);

// =====================================================
// SWAGGER API DOCUMENTATION
// =====================================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Clinic.AI Chatbot API',
  customfavIcon: '/favicon.ico'
}));

// Serve swagger.json
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// =====================================================
// API ROUTES
// =====================================================

app.use('/', healthRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userPatientRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Clinic.AI Chatbot Service',
    version: '1.0.0',
    status: 'running',
    documentation: {
      swagger: '/api-docs',
      openapi: '/api-docs.json'
    },
    endpoints: {
      health: '/health',
      websocket: 'ws://localhost:' + (process.env.PORT || 3001),
      conversations: '/api/conversations',
      userPatientMapping: '/api/users/:userId/patients'
    },
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// WEBSOCKET SETUP
// =====================================================

setupWebSocketHandlers(io);

// =====================================================
// ERROR HANDLING
// =====================================================

app.use(notFoundHandler);
app.use(errorHandler);

// =====================================================
// STARTUP
// =====================================================

async function startup() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting Clinic.AI Chatbot Service');
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
  console.log(`🐘 Database: PostgreSQL (${process.env.CHATBOT_DATABASE || 'chatbot'})`);
  
  try {
    // Test database connection
    console.log('\n🔌 Testing connections...');
    await testConnection();
    
    // Test AI provider
    console.log('🤖 Testing AI provider...');
    const aiWorks = await testAI();
    if (aiWorks) {
      console.log('✅ AI provider configured correctly');
    } else {
      console.warn('⚠️  AI provider test failed - check your API key');
    }
    
    console.log('\n✅ All startup checks passed!');
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

startup();

// =====================================================
// START SERVER
// =====================================================

const PORT = parseInt(process.env.PORT || '3001');

httpServer.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Server is Running');
  console.log('='.repeat(60));
  console.log(`📡 HTTP Server:      http://localhost:${PORT}`);
  console.log(`📚 API Docs:         http://localhost:${PORT}/api-docs`);
  console.log(`📄 OpenAPI Spec:     http://localhost:${PORT}/api-docs.json`);
  console.log(`🔌 WebSocket:        ws://localhost:${PORT}`);
  console.log(`💚 Health Check:     http://localhost:${PORT}/health`);
  console.log('='.repeat(60) + '\n');
  
  console.log('📋 Available Endpoints:');
  console.log('  GET  /                              - Service info');
  console.log('  GET  /health                        - Health check');
  console.log('  GET  /health/db                     - Database health');
  console.log('  GET  /api/conversations/:sessionId  - Get conversation');
  console.log('  GET  /api/conversations/patients/:patientId - Patient history');
  console.log('  DELETE /api/conversations/:sessionId - End conversation');
  console.log('  GET  /api/conversations/stats       - Statistics');
  console.log('  GET  /api/users/:userId/patients    - Get user\'s patients');
  console.log('  POST /api/users/:userId/patients    - Add patient to user');
  console.log('  GET  /api/users/:userId/patients/primary - Get primary patient');
  console.log('  PUT  /api/users/:userId/patients/:patientId/primary - Set primary');
  console.log('  DELETE /api/users/:userId/patients/:patientId - Remove patient');
  console.log('  WS   /socket.io                     - WebSocket connection');
  console.log('\n' + '='.repeat(60) + '\n');
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io };
