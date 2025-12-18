/**
 * User-Patient Mapping Model
 * Manages IAM user to FHIR Patient ID mappings
 */

import { Pool, QueryResult } from 'pg';
import { getDb } from '../database';

export interface UserPatientMapping {
  id?: number;
  iam_user_id: string;
  fhir_patient_id: string;
  is_primary: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class UserPatientMappingModel {
  /**
   * Add a new patient to a user's accessible patients
   */
  static async addPatientToUser(
    iamUserId: string,
    fhirPatientId: string,
    isPrimary: boolean = true
  ): Promise<UserPatientMapping> {
    const db = getDb();
    const query = `
      INSERT INTO user_patient_mapping (iam_user_id, fhir_patient_id, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (iam_user_id, fhir_patient_id) 
      DO UPDATE SET is_primary = $3, updated_at = NOW()
      RETURNING *;
    `;

    const result: QueryResult = await db.query(query, [iamUserId, fhirPatientId, isPrimary]);
    return result.rows[0];
  }

  /**
   * Get all patients accessible to a user
   */
  static async getPatientsByUser(iamUserId: string): Promise<string[]> {
    const db = getDb();
    const query = `
      SELECT fhir_patient_id 
      FROM user_patient_mapping 
      WHERE iam_user_id = $1
      ORDER BY is_primary DESC, created_at ASC;
    `;
 console.log('querying patients for user:', query, iamUserId);
    const result: QueryResult = await db.query(query, [iamUserId]);
    return result.rows.map(row => row.fhir_patient_id);
  }

  /**
   * Get primary patient for a user
   */
  static async getPrimaryPatient(iamUserId: string): Promise<string | null> {
    const db = getDb();
    const query = `
      SELECT fhir_patient_id 
      FROM user_patient_mapping 
      WHERE iam_user_id = $1 AND is_primary = true
      LIMIT 1;
    `;

    const result: QueryResult = await db.query(query, [iamUserId]);
    return result.rows.length > 0 ? result.rows[0].fhir_patient_id : null;
  }

  /**
   * Set a patient as primary for a user
   */
  static async setPrimaryPatient(iamUserId: string, fhirPatientId: string): Promise<void> {
    const db = getDb();
    
    // First, unset all as primary
    await db.query(
      `UPDATE user_patient_mapping SET is_primary = false WHERE iam_user_id = $1`,
      [iamUserId]
    );

    // Set the specified patient as primary
    await db.query(
      `UPDATE user_patient_mapping SET is_primary = true 
       WHERE iam_user_id = $1 AND fhir_patient_id = $2`,
      [iamUserId, fhirPatientId]
    );
  }

  /**
   * Remove a patient from user's accessible patients
   */
  static async removePatientFromUser(iamUserId: string, fhirPatientId: string): Promise<void> {
    const db = getDb();
    await db.query(
      `DELETE FROM user_patient_mapping 
       WHERE iam_user_id = $1 AND fhir_patient_id = $2`,
      [iamUserId, fhirPatientId]
    );
  }

  /**
   * Check if user has access to a patient
   */
  static async hasAccessToPatient(iamUserId: string, fhirPatientId: string): Promise<boolean> {
    const db = getDb();
    const query = `
      SELECT 1 FROM user_patient_mapping 
      WHERE iam_user_id = $1 AND fhir_patient_id = $2
      LIMIT 1;
    `;

    const result: QueryResult = await db.query(query, [iamUserId, fhirPatientId]);
    return result.rows.length > 0;
  }

  /**
   * Delete all mappings for a user
   */
  static async deleteUserMappings(iamUserId: string): Promise<void> {
    const db = getDb();
    await db.query(
      `DELETE FROM user_patient_mapping WHERE iam_user_id = $1`,
      [iamUserId]
    );
  }

  /**
   * Get all users who have access to a patient
   */
  static async getUsersForPatient(fhirPatientId: string): Promise<string[]> {
    const db = getDb();
    const query = `
      SELECT DISTINCT iam_user_id 
      FROM user_patient_mapping 
      WHERE fhir_patient_id = $1;
    `;

    const result: QueryResult = await db.query(query, [fhirPatientId]);
    return result.rows.map(row => row.iam_user_id);
  }
}
