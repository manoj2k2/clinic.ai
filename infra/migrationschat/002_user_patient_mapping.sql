-- Note: Table is created in 001_user_patient_mapping.sql with columns:
--   iam_user_id, fhir_patient_id, is_primary, created_at, updated_at
-- This migration adds indexes, views, and triggers consistent with those names.

-- Ensure we are operating on the chatbot database created in 000
\connect chatbot

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_user_id ON user_patient_mapping(iam_user_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_patient_id ON user_patient_mapping(fhir_patient_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_is_primary ON user_patient_mapping(iam_user_id, is_primary);
-- Expires_at column is not present in base schema; skip index

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_patient_mapping_updated_at ON user_patient_mapping;
CREATE TRIGGER update_user_patient_mapping_updated_at
    BEFORE UPDATE ON user_patient_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for active mappings (non-expired)
-- Active mappings view not needed without expiration column; skip

-- View for primary patient per user
CREATE OR REPLACE VIEW user_primary_patients AS
SELECT DISTINCT ON (iam_user_id)
    iam_user_id,
    fhir_patient_id
FROM user_patient_mapping
WHERE is_primary = true
ORDER BY iam_user_id;

-- Function to ensure only one primary patient per user
CREATE OR REPLACE FUNCTION ensure_single_primary_patient()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        -- Set all other mappings for this user to non-primary
                UPDATE user_patient_mapping
        SET is_primary = false
                WHERE iam_user_id = NEW.iam_user_id
          AND id != NEW.id
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single primary
DROP TRIGGER IF EXISTS ensure_single_primary_patient_trigger ON user_patient_mapping;
CREATE TRIGGER ensure_single_primary_patient_trigger
    AFTER INSERT OR UPDATE ON user_patient_mapping
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_patient();

-- Cleanup function for expired mappings
-- Cleanup function for expired mappings not applicable without expiration column; skip

-- Sample data (commented out)
-- INSERT INTO user_patient_mapping (iam_user_id, fhir_patient_id, is_primary, relationship)
-- VALUES ('keycloak-user-123', 'patient-001', true, 'self');

-- Verification
SELECT 'user_patient_mapping table created successfully' as status;
\d user_patient_mapping
