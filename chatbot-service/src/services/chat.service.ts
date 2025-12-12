import { ConversationModel, Message } from '../models/conversation.model';
import { SessionService } from './session.service';
import { chatWithAI } from '../ai-provider';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';

export interface ChatMessage {
  content: string;
  metadata?: any;
}

export interface ChatResponse {
  message: string;
  timestamp: string;
  conversationId?: number;
}

export class ChatService {
  /**
   * Process a chat message and get AI response
   */
  static async processMessage(
    sessionId: string,
    userMessage: ChatMessage,
    patientId?: string
  ): Promise<ChatResponse> {
    if (!userMessage.content || userMessage.content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    // Get or create conversation
    let conversation = await ConversationModel.findBySessionId(sessionId);
    if (!conversation) {
      conversation = await ConversationModel.create(sessionId, patientId);
    }

    // Add user message to database
    await ConversationModel.addMessage(
      conversation.id!,
      'user',
      userMessage.content,
      userMessage.metadata
    );

    // Get conversation history for AI context
    const history = await ConversationModel.getWithMessages(sessionId);
    const aiHistory = history!.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Get AI response
    const aiResult = await chatWithAI(userMessage.content, aiHistory);

    if (!aiResult.success) {
      throw new Error(aiResult.error || 'AI service unavailable');
    }

    // Save AI response
    await ConversationModel.addMessage(
      conversation.id!,
      'assistant',
      aiResult.response || 'Sorry, I could not generate a response.',
      { ai_provider: process.env.AI_PROVIDER }
    );

    // Update session
    const session = await SessionService.get(sessionId);
    if (session) {
      session.messageCount++;
      session.lastActivity = new Date().toISOString();
      await SessionService.set(sessionId, session);
    }

    return {
      message: aiResult.response!,
      timestamp: new Date().toISOString(),
      conversationId: conversation.id
    };
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(sessionId: string) {
    const data = await ConversationModel.getWithMessages(sessionId);
    
    if (!data) {
      throw new NotFoundError('Conversation');
    }

    return {
      conversation: data.conversation,
      messages: data.messages
    };
  }

  /**
   * Get patient's conversation history
   */
  static async getPatientHistory(patientId: string, limit: number = 10) {
    if (!patientId) {
      throw new ValidationError('Patient ID is required');
    }

    const conversations = await ConversationModel.getPatientHistory(patientId, limit);
    
    return {
      patientId,
      count: conversations.length,
      conversations
    };
  }

  /**
   * End a conversation
   */
  static async endConversation(sessionId: string) {
    await ConversationModel.updateStatus(sessionId, 'ended');
    await SessionService.delete(sessionId);
    
    return {
      sessionId,
      status: 'ended',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get conversation statistics
   */
  static async getStats() {
    const activeSessions = await SessionService.getActiveCount();
    
    return {
      activeSessions,
      timestamp: new Date().toISOString()
    };
  }
}
