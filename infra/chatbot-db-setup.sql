-- =====================================================
-- AI Chatbot Database Setup for PostgreSQL
-- =====================================================
-- Run this script to create the chatbot database and tables
-- Usage: psql -U admin -d postgres -f chatbot-db-setup.sql

-- Create database (if not exists)
SELECT 'CREATE DATABASE chatbot'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chatbot')\gexec

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE chatbot TO admin;

-- Connect to chatbot database
\c chatbot

-- =====================================================
-- TABLES
-- =====================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    patient_id VARCHAR(255),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screening sessions table
CREATE TABLE IF NOT EXISTS screening_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    conversation_id INTEGER REFERENCES conversations(id),
    patient_id VARCHAR(255) NOT NULL,
    chief_complaint TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb,
    risk_score INTEGER,
    triage_level VARCHAR(50) CHECK (triage_level IN ('emergency', 'urgent', 'routine', 'self-care')),
    recommendations JSONB DEFAULT '[]'::jsonb,
    fhir_resources JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    reviewed_by VARCHAR(255),
    review_notes TEXT,
    review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for session state management)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient_id ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE INDEX IF NOT EXISTS idx_screening_sessions_session_id ON screening_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_screening_sessions_patient_id ON screening_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_screening_sessions_status ON screening_sessions(status);
CREATE INDEX IF NOT EXISTS idx_screening_sessions_triage_level ON screening_sessions(triage_level);
CREATE INDEX IF NOT EXISTS idx_screening_sessions_start_time ON screening_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to screening_sessions
DROP TRIGGER IF EXISTS update_screening_sessions_updated_at ON screening_sessions;
CREATE TRIGGER update_screening_sessions_updated_at 
    BEFORE UPDATE ON screening_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old ended conversations (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_conversations(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM conversations 
    WHERE status = 'ended' 
      AND last_activity < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Active conversations view
CREATE OR REPLACE VIEW active_conversations AS
SELECT 
    c.id,
    c.session_id,
    c.patient_id,
    c.start_time,
    c.last_activity,
    COUNT(m.id) as message_count,
    MAX(m.timestamp) as last_message_time
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.status = 'active'
GROUP BY c.id;

-- High-risk screenings view (for practitioner review)
CREATE OR REPLACE VIEW high_risk_screenings AS
SELECT 
    s.id,
    s.session_id,
    s.patient_id,
    s.chief_complaint,
    s.symptoms,
    s.risk_score,
    s.triage_level,
    s.start_time,
    s.reviewed_by,
    c.session_id as conversation_session_id
FROM screening_sessions s
LEFT JOIN conversations c ON c.id = s.conversation_id
WHERE s.triage_level IN ('emergency', 'urgent')
  AND s.reviewed_by IS NULL
ORDER BY s.start_time DESC;

-- Daily conversation statistics view
CREATE OR REPLACE VIEW daily_conversation_stats AS
SELECT 
    DATE(start_time) as date,
    COUNT(DISTINCT id) as total_conversations,
    COUNT(DISTINCT patient_id) as unique_patients,
    AVG(message_count) as avg_messages_per_conversation,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_conversations,
    SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as ended_conversations
FROM (
    SELECT 
        c.id,
        c.patient_id,
        c.start_time,
        c.status,
        COUNT(m.id) as message_count
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    GROUP BY c.id
) subquery
GROUP BY DATE(start_time)
ORDER BY date DESC;

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert a test conversation (commented out - uncomment to use)
-- INSERT INTO conversations (session_id, patient_id, status) 
-- VALUES ('test-session-001', 'patient-001', 'active');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- List all tables
SELECT 'Tables created:' as status;
\dt

-- Count records in each table
SELECT 'conversations' as table_name, COUNT(*) as record_count FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'screening_sessions', COUNT(*) FROM screening_sessions
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;

-- Show indexes
SELECT 'Indexes created:' as status;
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Success message
SELECT '✅ Database setup complete!' as status;
SELECT 'Database: chatbot' as info;
SELECT 'Tables: 4 (conversations, messages, screening_sessions, sessions)' as info;
SELECT 'Views: 3 (active_conversations, high_risk_screenings, daily_conversation_stats)' as info;
SELECT 'Ready to use!' as info;
