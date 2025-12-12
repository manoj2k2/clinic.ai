#!/bin/bash
# Quick setup script for chatbot database
# Run this after docker-compose is up

echo "🔧 Setting up Chatbot Database..."

# Check if postgres_chatdb is running
if ! docker ps | grep -q postgres_chatdb; then
    echo "❌ postgres_chatdb container not running!"
    echo "Run: docker-compose -f infra/docker-compose.yml up -d postgres_chatdb"
    exit 1
fi

echo "⏳ Waiting for database to be ready..."
sleep 2

echo "📊 Creating user_patient_mapping table..."
docker exec -i postgres_chatdb psql -U chatuser -d chatdb << EOF
CREATE TABLE IF NOT EXISTS user_patient_mapping (
  id SERIAL PRIMARY KEY,
  iam_user_id VARCHAR(255) NOT NULL,
  fhir_patient_id VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(iam_user_id, fhir_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_user ON user_patient_mapping(iam_user_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_patient ON user_patient_mapping(fhir_patient_id);
CREATE INDEX IF NOT EXISTS idx_user_patient_mapping_primary ON user_patient_mapping(iam_user_id, is_primary);

\dt
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. cd chatbot-service"
    echo "2. cp .env.example .env"
    echo "3. Add GEMINI_API_KEY to .env"
    echo "4. npm install"
    echo "5. npm run dev"
else
    echo "❌ Database setup failed!"
    exit 1
fi
