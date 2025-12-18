import { ConversationModel, Message } from '../models/conversation.model';
import { SessionService } from './session.service';
import { chatWithAI } from '../ai-provider';
import { LangChainHealthcareAgentService } from './langchain-healthcare-agent.service';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';

export interface ChatMessage {
  content: string;
  metadata?: any;
  userId?: string; // Add userId for healthcare agent context
}

export interface ChatResponse {
  message: string;
  timestamp: string;
  conversationId?: number;
  healthcareActions?: any[]; // Add healthcare actions to response
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

    // Determine if this is a healthcare-related message
    const isHealthcareMessage = this.isHealthcareRelated(userMessage.content);

    let aiResult;
    let healthcareActions: any[] = [];

    if (isHealthcareMessage) {
      // Use LangChain healthcare agent for specialized medical assistance
      console.log('🏥 Routing to LangChain healthcare agent');
      const healthcareAgent = new LangChainHealthcareAgentService();

      const agentResponse = await healthcareAgent.processHealthcareMessage(
        userMessage.content,
        {
          userId: userMessage.userId,
          sessionId,
          patientId,
          conversationHistory: [] // LangChain agent handles its own memory
        }
      );

      aiResult = {
        success: agentResponse.success,
        response: agentResponse.response,
        error: agentResponse.success ? null : 'LangChain healthcare agent error'
      };

      healthcareActions = agentResponse.actions || [];
    } else {
      // Use general AI for non-healthcare messages
      console.log('💬 Using general AI response');
      aiResult = await chatWithAI(userMessage.content, aiHistory);
    }

    if (!aiResult.success) {
      throw new Error(aiResult.error || 'AI service unavailable');
    }

    // Save AI response with healthcare metadata
    const responseMetadata = {
      ai_provider: process.env.AI_PROVIDER,
      is_healthcare: isHealthcareMessage,
      healthcare_actions: healthcareActions.length,
      agent_type: isHealthcareMessage ? 'langchain' : 'general'
    };

    await ConversationModel.addMessage(
      conversation.id!,
      'assistant',
      aiResult.response || 'Sorry, I could not generate a response.',
      responseMetadata
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
      conversationId: conversation.id,
      healthcareActions: isHealthcareMessage ? healthcareActions : undefined
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

  /**
   * Determine if a message is healthcare-related
   */
  private static isHealthcareRelated(message: string): boolean {
    const healthcareKeywords = [
      // Symptoms and conditions
      'pain', 'ache', 'hurt', 'fever', 'cough', 'headache', 'nausea', 'dizzy',
      'chest pain', 'shortness of breath', 'vomiting', 'diarrhea', 'rash',
      'sore throat', 'runny nose', 'fatigue', 'weakness', 'swelling',

      // Medical actions
      'appointment', 'schedule', 'book', 'see doctor', 'check-up', 'exam',
      'prescription', 'medication', 'medicine', 'treatment', 'therapy',

      // Healthcare facilities and staff
      'clinic', 'hospital', 'doctor', 'nurse', 'physician', 'specialist',
      'emergency', 'urgent care', 'pharmacy', 'lab work', 'test results',

      // Health inquiries
      'insurance', 'billing', 'medical records', 'health records',
      'symptoms', 'diagnosis', 'condition', 'illness', 'disease',

      // Common health concerns
      'blood pressure', 'cholesterol', 'diabetes', 'asthma', 'allergy',
      'mental health', 'depression', 'anxiety', 'stress', 'sleep'
    ];

    const lowerMessage = message.toLowerCase();
    return healthcareKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
