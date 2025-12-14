/**
 * Test script for LangChain Healthcare Agent - API Test
 */

require('dotenv').config();
const http = require('http');

async function testHealthcareAPI() {
  console.log('🧪 Testing LangChain Healthcare Agent via API...');
  console.log('Making request to http://localhost:3001/api/healthcare/chat');

  const postData = JSON.stringify({
    message: "I have chest pain and difficulty breathing",
    sessionId: 'test-session-api',
    userId: 'test-user-api'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/healthcare/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ API Response:');
          console.log('Success:', response.success);
          console.log('Response:', response.response?.substring(0, 200) + '...');
          console.log('Actions:', response.actions?.length || 0);
          resolve(response);
        } catch (error) {
          console.log('Raw response:', data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testHealthcareAPI().then(() => {
  console.log('Test completed');
}).catch(console.error);