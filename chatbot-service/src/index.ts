import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './database';
import { ConversationModel } from './models/conversation.model';
import { UserPatientMappingModel } from './models/user-patient-mapping.model';
import { SessionService } from './services/session.service';
import { chatWithAI, testAI, getProviderInfo } from './ai-provider';
import { fhirClient } from './services/fhir-client.service';


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

app.use(cors());
app.use(express.json());

// Startup checks
async function startup() {
  console.log('🚀 Starting Chatbot Service...');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    // Test database connection
    await testConnection();
    
    // Get and display AI provider info
    const providerInfo = getProviderInfo();
    console.log(`🤖 AI Provider: ${providerInfo.provider.toUpperCase()}`);
    console.log(`   Model: ${providerInfo.model}`);
    console.log(`   Configured: ${providerInfo.configured ? '✅' : '❌'}`);
    
    // Test AI provider
    console.log('🧪 Testing AI provider...');
    const aiWorks = await testAI();
    if (aiWorks) {
      console.log('✅ AI provider test successful');
    } else {
      console.warn('⚠️  AI provider test failed - check your API key');
    }
    
    // Test FHIR server connection
    console.log('🧪 Testing FHIR server...');
    const fhirHealthy = await fhirClient.healthCheck();
    if (fhirHealthy) {
      console.log('✅ FHIR server connected');
      console.log(`   Base URL: ${process.env.FHIR_BASE_URL}`);
    } else {
      console.warn('⚠️  FHIR server not reachable - patient data features may not work');
      console.warn(`   Check if HAPI FHIR server is running at ${process.env.FHIR_BASE_URL}`);
    }
    
    console.log('✅ All systems ready!');

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

startup();

// =====================================================
// REST API ENDPOINTS
// =====================================================

// Health check
app.get('/health', async (req, res) => {
  try {
    const activeSessionsCount = await SessionService.getActiveCount();
    res.json({ 
      status: 'ok', 
      service: 'chatbot-service',
      version: '1.0.0',
      database: 'postgresql',
      activeSessions: activeSessionsCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

// Test chat page
app.get('/test', (req, res) => {
  console.log('Test chat page requested');
  res.sendFile(path.join(__dirname,'..', 'test-chat.html'));
});

app.get('/test-chat.html', (req, res) => {
  console.log('Test chat page requested');
  res.sendFile(path.join(__dirname, '..', 'test-chat.html'));
}); 

// Get conversation history
app.get('/api/conversations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const data = await ConversationModel.getWithMessages(sessionId);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      conversation: data.conversation,
      messages: data.messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
});

// Get patient conversation history
app.get('/api/patients/:patientId/conversations', async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const conversations = await ConversationModel.getPatientHistory(patientId, limit);
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient history'
    });
  }
});

// =====================================================
// USER-PATIENT MAPPING ENDPOINTS
// =====================================================

/**
 * Get all patients accessible to the authenticated user
 * Query params: userId (IAM user ID from token)
 */
app.get('/api/users/:userId/patients', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const patientIds = await UserPatientMappingModel.getPatientsByUser(userId);

    res.json({
      success: true,
      userId,
      patientIds,
      count: patientIds.length
    });
  } catch (error) {
    console.error('Error fetching user patients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user patients'
    });
  }
});

/**
 * Get the primary patient for a user
 */
app.get('/api/users/:userId/patients/primary', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const primaryPatientId = await UserPatientMappingModel.getPrimaryPatient(userId);

    if (!primaryPatientId) {
      return res.status(404).json({
        success: false,
        error: 'No primary patient found for user'
      });
    }

    res.json({
      success: true,
      userId,
      primaryPatientId
    });
  } catch (error) {
    console.error('Error fetching primary patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch primary patient'
    });
  }
});

/**
 * Add a patient to a user's accessible patients
 */
app.post('/api/users/:userId/patients', async (req, res) => {
  try {
    const { userId } = req.params;
    const { patientId, isPrimary } = req.body;

    if (!userId || !patientId) {
      return res.status(400).json({
        success: false,
        error: 'userId and patientId are required'
      });
    }

    const mapping = await UserPatientMappingModel.addPatientToUser(userId, patientId, isPrimary !== false);

    res.json({
      success: true,
      message: `Patient ${patientId} added to user ${userId}`,
      mapping
    });
  } catch (error) {
    console.error('Error adding patient to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add patient to user'
    });
  }
});

/**
 * Set a patient as primary for a user
 */
app.put('/api/users/:userId/patients/:patientId/primary', async (req, res) => {
  try {
    const { userId, patientId } = req.params;

    if (!userId || !patientId) {
      return res.status(400).json({
        success: false,
        error: 'userId and patientId are required'
      });
    }

    // Check access first
    const hasAccess = await UserPatientMappingModel.hasAccessToPatient(userId, patientId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Patient not found or user does not have access'
      });
    }

    await UserPatientMappingModel.setPrimaryPatient(userId, patientId);

    res.json({
      success: true,
      message: `Patient ${patientId} set as primary for user ${userId}`
    });
  } catch (error) {
    console.error('Error setting primary patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set primary patient'
    });
  }
});

/**
 * Check if user has access to a patient
 */
app.get('/api/users/:userId/patients/:patientId/access', async (req, res) => {
  try {
    const { userId, patientId } = req.params;

    const hasAccess = await UserPatientMappingModel.hasAccessToPatient(userId, patientId);

    res.json({
      success: true,
      userId,
      patientId,
      hasAccess
    });
  } catch (error) {
    console.error('Error checking patient access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check patient access'
    });
  }
});

/**
 * Remove a patient from user's accessible patients
 */
app.delete('/api/users/:userId/patients/:patientId', async (req, res) => {
  try {
    const { userId, patientId } = req.params;

    if (!userId || !patientId) {
      return res.status(400).json({
        success: false,
        error: 'userId and patientId are required'
      });
    }

    await UserPatientMappingModel.removePatientFromUser(userId, patientId);

    res.json({
      success: true,
      message: `Patient ${patientId} removed from user ${userId}`
    });
  } catch (error) {
    console.error('Error removing patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove patient'
    });
  }
});

// =====================================================
// WEBSOCKET HANDLERS
// =====================================================

io.on('connection', async (socket) => {
  const sessionId = socket.handshake.query.sessionId as string || socket.id;
  const patientId = socket.handshake.query.patientId as string;
  
  console.log(`✅ Client connected: ${sessionId}`);
  
  try {
    // Get or create session
    let session = await SessionService.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        patientId,
        startTime: new Date().toISOString(),
        messageCount: 0,
        lastActivity: new Date().toISOString()
      };
      await SessionService.set(sessionId, session);
    }

    // Get or create conversation
    let conversationData = await ConversationModel.findBySessionId(sessionId);
    if (!conversationData) {
      conversationData = await ConversationModel.create(sessionId, patientId);
      console.log(`📝 Created new conversation: ${conversationData.id}`);
    } else {
      console.log(`📝 Resumed conversation: ${conversationData.id}`);
    }

    // Send connection confirmation
    socket.emit('connected', { 
      sessionId,
      conversationId: conversationData.id,
      message: 'Connected to AI Medical Assistant',
      timestamp: new Date().toISOString()
    });

    // Handle incoming messages
    socket.on('message', async (data) => {
      try {
        console.log(`📨 [${sessionId}] User: ${data.content}`);

        // Add user message to database
        await ConversationModel.addMessage(
          conversationData!.id!,
          'user',
          data.content
        );

        // Emit typing indicator
        socket.emit('typing', { isTyping: true });

        // Get conversation history for context
        const history = await ConversationModel.getWithMessages(sessionId);
        const aiHistory = history!.messages.map(m => ({
          role: m.role,
          content: m.content
        }));

        // Get AI response
        const aiResult = await chatWithAI(data.content, aiHistory);

        // Stop typing indicator
        socket.emit('typing', { isTyping: false });

        if (!aiResult.success) {
          socket.emit('error', { 
            message: aiResult.response,
            timestamp: new Date().toISOString()
          });
          return;
        }

        console.log(`🤖 [${sessionId}] AI: ${aiResult.response?.substring(0, 100)}...`);

        // Save AI response to database
        await ConversationModel.addMessage(
          conversationData!.id!,
          'assistant',
          aiResult.response || 'Sorry, I could not generate a response.'
        );

        // Update session
        session!.messageCount++;
        session!.lastActivity = new Date().toISOString();
        await SessionService.set(sessionId, session!, 1800); // 30 min TTL

        // Send response to client
        socket.emit('response', {
          message: aiResult.response,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ Error processing message:`, error);
        socket.emit('error', { 
          message: 'Failed to process your message. Please try again.',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle typing indicator from client
    socket.on('typing', (data) => {
      // Could broadcast to other clients or log
      console.log(`⌨️  [${sessionId}] User is typing: ${data.isTyping}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ Client disconnected: ${sessionId}`);
      
      // Update conversation status if needed
      // await ConversationModel.updateStatus(sessionId, 'ended');
    });

  } catch (error) {
    console.error('Error in socket connection:', error);
    socket.emit('error', { 
      message: 'Connection error. Please refresh and try again.',
      timestamp: new Date().toISOString()
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

const PORT = parseInt(process.env.PORT || '3001');

httpServer.listen(PORT, () => {
  const providerInfo = getProviderInfo();
  console.log('\n' + '='.repeat(50));
  console.log(`🤖 AI Chatbot Service Running`);
  console.log('='.repeat(50));
  console.log(`📡 HTTP Server:     http://localhost:${PORT}`);
  console.log(`🔌 WebSocket:       ws://localhost:${PORT}`);
  console.log(`📊 Health Check:    http://localhost:${PORT}/health`);
  console.log(`🧪 Test Chat:       http://localhost:${PORT}/test`);
  console.log(`🐘 Database:        PostgreSQL (${process.env.CHATBOT_DATABASE})`);
  console.log(`🤖 AI Provider:     ${providerInfo.provider.toUpperCase()} (${providerInfo.model})`);
  console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
