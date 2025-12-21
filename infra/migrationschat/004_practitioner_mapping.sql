-- =====================================================
-- Practitioner Self-Onboarding Mapping
-- =====================================================
-- Maps IAM users to a single FHIR Practitioner and Organization
-- Migration: 004_practitioner_mapping.sql

-- Connect to chatbot database
\c chatbot

CREATE TABLE IF NOT EXISTS user_practitioner_mapping (
  id SERIAL PRIMARY KEY,
  iam_user_id VARCHAR(255) NOT NULL UNIQUE,
  fhir_practitioner_id VARCHAR(255) NOT NULL,
  fhir_organization_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_practitioner_iam ON user_practitioner_mapping(iam_user_id);
CREATE INDEX IF NOT EXISTS idx_user_practitioner_org ON user_practitioner_mapping(fhir_organization_id);

COMMENT ON TABLE user_practitioner_mapping IS 'Enforces one-organization-per-practitioner by unique iam_user_id.';
