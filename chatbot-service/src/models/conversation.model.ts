import { chatbotPool } from '../database';

export interface Conversation {
  id?: number;
  session_id: string;
  patient_id?: string;
  start_time?: Date;
  last_activity?: Date;
  status?: 'active' | 'ended';
  metadata?: any;
}

export interface Message {
  id?: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  timestamp?: Date;
}

export class ConversationModel {
  // Create new conversation
  static async create(sessionId: string, patientId?: string): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (session_id, patient_id, status)
      VALUES ($1, $2, 'active')
      RETURNING *
    `;
    const result = await chatbotPool.query(query, [sessionId, patientId || null]);
    return result.rows[0];
  }

  // Find conversation by session ID
  static async findBySessionId(sessionId: string): Promise<Conversation | null> {
    const query = 'SELECT * FROM conversations WHERE session_id = $1';
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
    const messagesResult = await chatbotPool.query(messagesQuery, [conversation.id]);

    return {
      conversation,
      messages: messagesResult.rows
    };
  }

  // Add message to conversation
  static async addMessage(
    conversationId: number,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<Message> {
    const client = await chatbotPool.connect();
    try {
      await client.query('BEGIN');

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
        metadata ? JSON.stringify(metadata) : '{}'
      ]);

      // Update conversation last_activity
      const updateQuery = `
        UPDATE conversations 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      await client.query(updateQuery, [conversationId]);

      await client.query('COMMIT');
      return messageResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Update conversation status
  static async updateStatus(sessionId: string, status: 'active' | 'ended'): Promise<void> {
    const query = `
      UPDATE conversations 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE session_id = $2
    `;
    await chatbotPool.query(query, [status, sessionId]);
  }

  // Get conversation history for patient
  static async getPatientHistory(patientId: string, limit = 10): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations 
      WHERE patient_id = $1 
      ORDER BY start_time DESC 
      LIMIT $2
    `;
    const result = await chatbotPool.query(query, [patientId, limit]);
    return result.rows;
  }

  // Get message count for conversation
  static async getMessageCount(conversationId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1';
    const result = await chatbotPool.query(query, [conversationId]);
    return parseInt(result.rows[0].count);
  }
}
