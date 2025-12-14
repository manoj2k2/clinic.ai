-- =====================================================
-- Healthcare Agent Metadata Migration
-- =====================================================
-- Adds tables for healthcare agent actions and metadata
-- Migration: 003_healthcare_agent.sql

-- Connect to chatbot database
\c chatbot

-- =====================================================
-- Healthcare Actions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS healthcare_actions (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'screening_complete',
        'appointment_booked',
        'practitioner_recommended',
        'emergency_detected',
        'follow_up_needed'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Healthcare Metadata Table
-- =====================================================

CREATE TABLE IF NOT EXISTS healthcare_metadata (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    metadata_type VARCHAR(50) NOT NULL, -- 'screening', 'appointment', 'general'
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_healthcare_actions_conversation ON healthcare_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_actions_type ON healthcare_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_healthcare_actions_status ON healthcare_actions(status);
CREATE INDEX IF NOT EXISTS idx_healthcare_actions_priority ON healthcare_actions(priority);

CREATE INDEX IF NOT EXISTS idx_healthcare_metadata_conversation ON healthcare_metadata(conversation_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_metadata_session ON healthcare_metadata(session_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_metadata_type ON healthcare_metadata(metadata_type);

-- =====================================================
-- Sample Data (Optional)
-- =====================================================

-- Insert sample healthcare action types (for reference)
INSERT INTO healthcare_actions (conversation_id, message_id, action_type, priority, action_data, status)
SELECT
    c.id,
    m.id,
    'screening_complete',
    'medium',
    '{"symptoms": ["headache"], "severity": "mild", "recommendations": ["rest and hydration"]}'::jsonb,
    'completed'
FROM conversations c
JOIN messages m ON c.id = m.conversation_id
WHERE m.metadata->>'is_healthcare' = 'true'
AND NOT EXISTS (
    SELECT 1 FROM healthcare_actions ha
    WHERE ha.conversation_id = c.id AND ha.action_type = 'screening_complete'
)
LIMIT 1;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE healthcare_actions IS 'Stores healthcare-specific actions taken by the AI agent';
COMMENT ON TABLE healthcare_metadata IS 'Stores additional healthcare metadata for conversations';

COMMENT ON COLUMN healthcare_actions.action_type IS 'Type of healthcare action performed';
COMMENT ON COLUMN healthcare_actions.priority IS 'Urgency level of the action';
COMMENT ON COLUMN healthcare_actions.action_data IS 'Structured data related to the action';
COMMENT ON COLUMN healthcare_actions.status IS 'Current status of the action';

COMMENT ON COLUMN healthcare_metadata.metadata_type IS 'Type of healthcare metadata stored';
COMMENT ON COLUMN healthcare_metadata.metadata IS 'Flexible JSON metadata storage';