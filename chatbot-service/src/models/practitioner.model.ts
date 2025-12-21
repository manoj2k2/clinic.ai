import { QueryResult } from 'pg';
import { getDb } from '../database';

export interface UserPractitionerMapping {
  id?: number;
  iam_user_id: string;
  fhir_practitioner_id: string;
  fhir_organization_id: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PractitionerModel {
  static async getMappingByUser(iamUserId: string): Promise<UserPractitionerMapping | null> {
    const db = getDb();
    const result: QueryResult = await db.query(
      `SELECT * FROM user_practitioner_mapping WHERE iam_user_id = $1 LIMIT 1`,
      [iamUserId]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  static async upsertMapping(
    iamUserId: string,
    fhirPractitionerId: string,
    fhirOrganizationId: string
  ): Promise<UserPractitionerMapping> {
    const db = getDb();
    const result: QueryResult = await db.query(
      `INSERT INTO user_practitioner_mapping (iam_user_id, fhir_practitioner_id, fhir_organization_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (iam_user_id)
       DO UPDATE SET fhir_practitioner_id = EXCLUDED.fhir_practitioner_id,
                     fhir_organization_id = EXCLUDED.fhir_organization_id,
                     updated_at = NOW()
       RETURNING *;`,
      [iamUserId, fhirPractitionerId, fhirOrganizationId]
    );
    return result.rows[0];
  }
}
