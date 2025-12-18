-- User-Patient Mapping Table Migration
-- Creates the mapping between IAM users and FHIR patients
-- Enables multi-patient support for family members

-- Ensure we are operating on the chatbot database created in 000
\connect chatbot

CREATE TABLE IF NOT EXISTS user_patient_mapping (
  id SERIAL PRIMARY KEY,
  iam_user_id VARCHAR(255) NOT NULL,
  fhir_patient_id VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(iam_user_id, fhir_patient_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_user ON user_patient_mapping(iam_user_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_patient ON user_patient_mapping(fhir_patient_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_primary ON user_patient_mapping(iam_user_id, is_primary);


-- Sample queries for testing:
-- Get all patients for a user:
-- SELECT fhir_patient_id FROM user_patient_mapping WHERE iam_user_id = 'user-uuid' ORDER BY is_primary DESC, created_at ASC;
--
-- Get primary patient for a user:
-- SELECT fhir_patient_id FROM user_patient_mapping WHERE iam_user_id = 'user-uuid' AND is_primary = true LIMIT 1;
--
-- Add patient mapping:
-- INSERT INTO user_patient_mapping (iam_user_id, fhir_patient_id, is_primary) VALUES ('user-uuid', 'patient-id', true)
-- ON CONFLICT (iam_user_id, fhir_patient_id) DO UPDATE SET is_primary = true, updated_at = NOW();
--
-- Set patient as primary:
-- UPDATE user_patient_mapping SET is_primary = false WHERE iam_user_id = 'user-uuid';
-- UPDATE user_patient_mapping SET is_primary = true WHERE iam_user_id = 'user-uuid' AND fhir_patient_id = 'patient-id';
