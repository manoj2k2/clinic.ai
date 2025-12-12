-- =====================================================
-- USER-PATIENT MAPPING TABLE
-- =====================================================
-- This table maps IAM users to FHIR patient resources
-- Allows users to have access to multiple patients (e.g., family members)

CREATE TABLE IF NOT EXISTS user_patient_mapping (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,        -- Keycloak/IAM user ID
    patient_id VARCHAR(255) NOT NULL,     -- FHIR Patient resource ID
    is_primary BOOLEAN DEFAULT true,      -- Primary patient for this user
    relationship VARCHAR(100),            -- e.g., 'self', 'child', 'spouse', 'parent'
    access_level VARCHAR(50) DEFAULT 'full', -- 'full', 'read-only', 'limited'
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255),              -- Who granted access
    expires_at TIMESTAMP,                 -- Optional expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique user-patient combinations
    UNIQUE(user_id, patient_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_user_id ON user_patient_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_patient_id ON user_patient_mapping(patient_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_is_primary ON user_patient_mapping(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_expires_at ON user_patient_mapping(expires_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_patient_mapping_updated_at ON user_patient_mapping;
CREATE TRIGGER update_user_patient_mapping_updated_at
    BEFORE UPDATE ON user_patient_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for active mappings (non-expired)
CREATE OR REPLACE VIEW active_user_patient_mappings AS
SELECT *
FROM user_patient_mapping
WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- View for primary patient per user
CREATE OR REPLACE VIEW user_primary_patients AS
SELECT DISTINCT ON (user_id) 
    user_id,
    patient_id,
    relationship,
    granted_at
FROM user_patient_mapping
WHERE is_primary = true
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
ORDER BY user_id, granted_at DESC;

-- Function to ensure only one primary patient per user
CREATE OR REPLACE FUNCTION ensure_single_primary_patient()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        -- Set all other mappings for this user to non-primary
        UPDATE user_patient_mapping
        SET is_primary = false
        WHERE user_id = NEW.user_id
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
CREATE OR REPLACE FUNCTION cleanup_expired_user_patient_mappings()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_patient_mapping 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Sample data (commented out)
-- INSERT INTO user_patient_mapping (user_id, patient_id, is_primary, relationship)
-- VALUES ('keycloak-user-123', 'patient-001', true, 'self');

-- Verification
SELECT 'user_patient_mapping table created successfully' as status;
\d user_patient_mapping
