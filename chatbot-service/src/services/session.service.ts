import { chatbotPool } from '../database';

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
  static async set(sessionId: string, data: SessionData, ttlSeconds = 1800): Promise<void> {
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
    
    await chatbotPool.query(query, [sessionId, JSON.stringify(data), expiresAt]);
  }

  // Get session
  static async get(sessionId: string): Promise<SessionData | null> {
    // Clean up expired sessions first (lightweight check)
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
    const query = 'DELETE FROM sessions WHERE session_id = $1';
    await chatbotPool.query(query, [sessionId]);
  }

  // Cleanup expired sessions
  static async cleanup(): Promise<number> {
    const query = 'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP';
    const result = await chatbotPool.query(query);
    return result.rowCount || 0;
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

  // Extend session expiry
  static async extend(sessionId: string, additionalSeconds = 1800): Promise<void> {
    const query = `
      UPDATE sessions 
      SET expires_at = expires_at + ($2 || ' seconds')::INTERVAL
      WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP
    `;
    await chatbotPool.query(query, [sessionId, additionalSeconds]);
  }
}

// Schedule cleanup every 5 minutes
setInterval(() => {
  SessionService.cleanup()
    .then(count => {
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired sessions`);
      }
    })
    .catch(err => console.error('Error cleaning up sessions:', err));
}, 5 * 60 * 1000);
