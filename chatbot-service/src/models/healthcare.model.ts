/**
 * Healthcare Agent Models
 *
 * Models for healthcare actions, metadata, and agent functionality
 */

import { Pool, QueryResult } from 'pg';
import { getDb } from '../database';

export interface HealthcareAction {
  id?: number;
  conversation_id: number;
  message_id: number;
  action_type: 'screening_complete' | 'appointment_booked' | 'practitioner_recommended' | 'emergency_detected' | 'follow_up_needed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_data: any;
  status: 'pending' | 'completed' | 'cancelled';
  resolved_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface HealthcareMetadata {
  id?: number;
  conversation_id: number;
  session_id: string;
  metadata_type: string;
  metadata: any;
  created_at?: Date;
}

export class HealthcareModel {
  /**
   * Create a healthcare action
   */
  static async createAction(
    conversationId: number,
    messageId: number,
    actionType: HealthcareAction['action_type'],
    priority: HealthcareAction['priority'],
    actionData: any
  ): Promise<HealthcareAction> {
    const db = getDb();
    const query = `
      INSERT INTO healthcare_actions (
        conversation_id, message_id, action_type, priority, action_data
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result: QueryResult = await db.query(query, [
      conversationId,
      messageId,
      actionType,
      priority,
      JSON.stringify(actionData)
    ]);

    return result.rows[0];
  }

  /**
   * Get actions for a conversation
   */
  static async getActionsByConversation(conversationId: number): Promise<HealthcareAction[]> {
    const db = getDb();
    const query = `
      SELECT * FROM healthcare_actions
      WHERE conversation_id = $1
      ORDER BY created_at DESC;
    `;

    const result: QueryResult = await db.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Update action status
   */
  static async updateActionStatus(
    actionId: number,
    status: HealthcareAction['status'],
    resolvedAt?: Date
  ): Promise<HealthcareAction> {
    const db = getDb();
    const query = `
      UPDATE healthcare_actions
      SET status = $1, resolved_at = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const result: QueryResult = await db.query(query, [status, resolvedAt, actionId]);
    return result.rows[0];
  }

  /**
   * Get pending urgent actions
   */
  static async getUrgentActions(): Promise<HealthcareAction[]> {
    const db = getDb();
    const query = `
      SELECT * FROM healthcare_actions
      WHERE status = 'pending' AND priority = 'urgent'
      ORDER BY created_at DESC;
    `;

    const result: QueryResult = await db.query(query);
    return result.rows;
  }

  /**
   * Store healthcare metadata
   */
  static async storeMetadata(
    conversationId: number,
    sessionId: string,
    metadataType: string,
    metadata: any
  ): Promise<HealthcareMetadata> {
    const db = getDb();
    const query = `
      INSERT INTO healthcare_metadata (
        conversation_id, session_id, metadata_type, metadata
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result: QueryResult = await db.query(query, [
      conversationId,
      sessionId,
      metadataType,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Get metadata for a conversation
   */
  static async getMetadataByConversation(conversationId: number): Promise<HealthcareMetadata[]> {
    const db = getDb();
    const query = `
      SELECT * FROM healthcare_metadata
      WHERE conversation_id = $1
      ORDER BY created_at DESC;
    `;

    const result: QueryResult = await db.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Get screening history for a patient
   */
  static async getPatientScreeningHistory(patientId: string): Promise<any[]> {
    const db = getDb();
    const query = `
      SELECT
        ha.*,
        c.session_id,
        m.content as user_message,
        m.timestamp as screening_time
      FROM healthcare_actions ha
      JOIN conversations c ON ha.conversation_id = c.id
      JOIN messages m ON ha.message_id = m.id
      WHERE c.patient_id = $1
        AND ha.action_type = 'screening_complete'
        AND ha.status = 'completed'
      ORDER BY ha.created_at DESC;
    `;

    const result: QueryResult = await db.query(query, [patientId]);
    return result.rows;
  }

  /**
   * Get appointment booking history
   */
  static async getAppointmentHistory(patientId: string): Promise<any[]> {
    const db = getDb();
    const query = `
      SELECT
        ha.*,
        c.session_id,
        m.content as booking_request,
        m.timestamp as booking_time
      FROM healthcare_actions ha
      JOIN conversations c ON ha.conversation_id = c.id
      JOIN messages m ON ha.message_id = m.id
      WHERE c.patient_id = $1
        AND ha.action_type = 'appointment_booked'
      ORDER BY ha.created_at DESC;
    `;

    const result: QueryResult = await db.query(query, [patientId]);
    return result.rows;
  }

  /**
   * Get healthcare statistics
   */
  static async getHealthcareStats(): Promise<any> {
    const db = getDb();

    const statsQuery = `
      SELECT
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action_type = 'screening_complete' THEN 1 END) as screenings,
        COUNT(CASE WHEN action_type = 'appointment_booked' THEN 1 END) as appointments,
        COUNT(CASE WHEN action_type = 'emergency_detected' THEN 1 END) as emergencies,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_actions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_actions
      FROM healthcare_actions;
    `;

    const result: QueryResult = await db.query(statsQuery);
    return result.rows[0];
  }

  /**
   * Clean up old completed actions (older than 30 days)
   */
  static async cleanupOldActions(): Promise<number> {
    const db = getDb();
    const query = `
      DELETE FROM healthcare_actions
      WHERE status = 'completed'
        AND resolved_at < NOW() - INTERVAL '30 days';
    `;

    const result: QueryResult = await db.query(query);
    return result.rowCount || 0;
  }
}