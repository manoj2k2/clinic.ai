import { Pool } from 'pg';

// Connection pool for chatbot database
export const chatbotPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5430'),
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  database: process.env.CHATBOT_DATABASE || 'chatbot',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection pool for FHIR database (if needed)
export const fhirPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5430'),
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin',
  database: process.env.FHIR_DATABASE || 'hapi02',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
export async function testConnection() {
  try {
    const client = await chatbotPool.connect();
    const result = await client.query('SELECT NOW() as now, current_database() as database');
    console.log('✅ Connected to PostgreSQL');
    console.log(`   Database: ${result.rows[0].database}`);
    console.log(`   Time: ${result.rows[0].now}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await chatbotPool.end();
  await fhirPool.end();
});

process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await chatbotPool.end();
  await fhirPool.end();
  process.exit(0);
});
