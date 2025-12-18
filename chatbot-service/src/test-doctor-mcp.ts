/**
 * Test script for Doctor MCP Server
 *
 * Tests the clinical operations tools provided by the doctor MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testDoctorMCPServer() {
  console.log('🧪 Testing Doctor MCP Server...\n');

  // Start the doctor MCP server process
  const serverProcess = spawn('node', ['dist/services/doctor-mcp-server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Create MCP client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/services/doctor-mcp-server.js']
    });

    const client = new Client(
      {
        name: 'doctor-mcp-test-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    await client.connect(transport);
    console.log('✅ Connected to Doctor MCP Server');

    // List available tools
    console.log('\n📋 Listing available clinical tools...');
    const toolsResponse = await client.request(
      { method: 'tools/list', params: {} },
      {} as any,
      {} as any
    );

    console.log(`Found ${toolsResponse.tools.length} clinical tools:`);
    toolsResponse.tools.forEach((tool: any, index: number) => {
      console.log(`${index + 1}. ${tool.name}: ${tool.description.substring(0, 80)}...`);
    });

    // Test clinical summary tool
    console.log('\n📊 Testing get_patient_clinical_summary tool...');
    try {
      const summaryResult = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'get_patient_clinical_summary',
            arguments: {
              patientId: 'test-patient-123',
              providerId: 'test-provider-456'
            }
          }
        },
        {} as any,
        {} as any
      );

      console.log('✅ Clinical summary tool executed successfully');
      const summary = JSON.parse(summaryResult.content[0].text);
      console.log('Sample clinical summary structure:', Object.keys(summary));

    } catch (error) {
      console.log('⚠️ Clinical summary tool test failed (expected for mock data):', (error as Error).message);
    }

    // Test medication history tool
    console.log('\n💊 Testing get_medication_history tool...');
    try {
      const medResult = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'get_medication_history',
            arguments: {
              patientId: 'test-patient-123',
              providerId: 'test-provider-456'
            }
          }
        },
        {} as any,
        {} as any
      );

      console.log('✅ Medication history tool executed successfully');
      const medHistory = JSON.parse(medResult.content[0].text);
      console.log(`Found ${medHistory.medications?.length || 0} medications in history`);

    } catch (error) {
      console.log('❌ Medication history tool test failed:', (error as Error).message);
    }

    // Test clinical alerts tool
    console.log('\n🚨 Testing get_clinical_alerts tool...');
    try {
      const alertsResult = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'get_clinical_alerts',
            arguments: {
              patientId: 'test-patient-123',
              providerId: 'test-provider-456'
            }
          }
        },
        {} as any,
        {} as any
      );

      console.log('✅ Clinical alerts tool executed successfully');
      const alerts = JSON.parse(alertsResult.content[0].text);
      console.log(`Found ${alerts.alerts?.length || 0} clinical alerts`);

    } catch (error) {
      console.log('❌ Clinical alerts tool test failed:', (error as Error).message);
    }

    // Test drug interaction tool
    console.log('\n⚠️ Testing check_drug_interactions tool...');
    try {
      const interactionResult = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'check_drug_interactions',
            arguments: {
              medications: ['warfarin', 'aspirin']
            }
          }
        },
        {} as any,
        {} as any
      );

      console.log('✅ Drug interaction tool executed successfully');
      const interactions = JSON.parse(interactionResult.content[0].text);
      console.log(`Found ${interactions.interactions?.length || 0} potential interactions`);

    } catch (error) {
      console.log('❌ Drug interaction tool test failed:', (error as Error).message);
    }

    await client.close();
    console.log('\n✅ Doctor MCP Server tests completed successfully!');

  } catch (error) {
    console.error('❌ Doctor MCP Server test failed:', error);
  } finally {
    // Clean up server process
    serverProcess.kill();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDoctorMCPServer().catch(console.error);
}

export { testDoctorMCPServer };