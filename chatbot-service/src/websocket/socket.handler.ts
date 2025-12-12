import { Server, Socket } from 'socket.io';
import { ConversationModel } from '../models/conversation.model';
import { SessionService } from '../services/session.service';
import { ChatService } from '../services/chat.service';

export function setupWebSocketHandlers(io: Server) {
  io.on('connection', async (socket: Socket) => {
    const sessionId = socket.handshake.query.sessionId as string || socket.id;
    const patientId = socket.handshake.query.patientId as string;
    
    console.log(`✅ WebSocket connected: ${sessionId}`);
    
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
      let conversation = await ConversationModel.findBySessionId(sessionId);
      if (!conversation) {
        conversation = await ConversationModel.create(sessionId, patientId);
        console.log(`📝 Created conversation: ${conversation.id} for session: ${sessionId}`);
      } else {
        console.log(`📝 Resumed conversation: ${conversation.id} for session: ${sessionId}`);
      }

      // Send connection confirmation
      socket.emit('connected', {
        sessionId,
        conversationId: conversation.id,
        message: 'Connected to AI Medical Assistant',
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      socket.on('message', async (data) => {
        try {
          console.log(`📨 [${sessionId}] User: ${data.content?.substring(0, 100)}...`);

          // Emit typing indicator
          socket.emit('typing', { isTyping: true });

          // Process message through service layer
          const response = await ChatService.processMessage(
            sessionId,
            { content: data.content, metadata: data.metadata },
            patientId
          );

          // Stop typing indicator
          socket.emit('typing', { isTyping: false });

          console.log(`🤖 [${sessionId}] AI: ${response.message.substring(0, 100)}...`);

          // Send response to client
          socket.emit('response', response);

        } catch (error: any) {
          console.error(`❌ Error processing message for ${sessionId}:`, error);
          
          socket.emit('typing', { isTyping: false });
          socket.emit('error', {
            message: error.message || 'Failed to process your message. Please try again.',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle typing indicator from client
      socket.on('typing', (data) => {
        console.log(`⌨️  [${sessionId}] User typing: ${data.isTyping}`);
        // Could broadcast to other clients if needed
      });

      // Handle getting conversation history
      socket.on('getHistory', async () => {
        try {
          const data = await ChatService.getConversationHistory(sessionId);
          socket.emit('history', {
            success: true,
            ...data
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to load conversation history',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`❌ WebSocket disconnected: ${sessionId}`);
        
        // Optional: Mark conversation as ended after timeout
        // await ConversationModel.updateStatus(sessionId, 'ended');
      });

    } catch (error) {
      console.error('Error in WebSocket connection setup:', error);
      socket.emit('error', {
        message: 'Connection error. Please refresh and try again.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Log WebSocket server metrics
  setInterval(() => {
    const connectedClients = io.sockets.sockets.size;
    if (connectedClients > 0) {
      console.log(`📊 Active WebSocket connections: ${connectedClients}`);
    }
  }, 60000); // Log every minute if there are connections
}
