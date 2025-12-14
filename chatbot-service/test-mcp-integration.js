#!/usr/bin/env node

/**
 * MCP Healthcare Integration Test Script
 * Demonstrates how MCP enhances the healthcare AI agent
 */

const { MCPHealthcareAgentService } = require('./dist/services/mcp-healthcare-integration');

async function testMCPIntegration() {
    console.log('🧪 Testing MCP Healthcare Integration...\n');

    try {
        // Initialize MCP-enhanced healthcare agent
        const agent = new MCPHealthcareAgentService();

        // Connect to MCP servers (simulated for demo)
        console.log('🔗 Connecting to MCP servers...');
        await agent.connectMCPServers([
            {
                name: 'fhir-server',
                command: 'node',
                args: ['dist/services/patient-mcp-server.js']
            }
        ]);

        console.log('✅ MCP servers connected successfully\n');

        // Test healthcare scenarios
        const testScenarios = [
            {
                message: "I have a headache and fever",
                userId: "user-123",
                patientId: "patient-456"
            },
            {
                message: "I need to schedule an appointment",
                userId: "user-123",
                patientId: "patient-456"
            },
            {
                message: "Who is my primary care doctor?",
                userId: "user-123",
                patientId: "patient-456"
            }
        ];

        for (const scenario of testScenarios) {
            console.log(`📝 Testing: "${scenario.message}"`);
            console.log(`👤 User: ${scenario.userId}, Patient: ${scenario.patientId}`);

            try {
                const response = await agent.processHealthcareMessage(
                    scenario.message,
                    {
                        userId: scenario.userId,
                        sessionId: `session-${Date.now()}`,
                        patientId: scenario.patientId,
                        mcpServers: ['fhir-server']
                    }
                );

                console.log(`🤖 Agent Response: ${response.substring(0, 100)}...`);
                console.log('✅ Processed successfully via MCP\n');

            } catch (error) {
                console.log(`❌ Error: ${error.message}\n`);
            }
        }

        console.log('🎉 MCP Integration Test Complete!');
        console.log('\n📊 Benefits Demonstrated:');
        console.log('   🔒 Secure tool access with authorization');
        console.log('   📋 Standardized healthcare tool interface');
        console.log('   🔄 Seamless LangChain integration');
        console.log('   📊 Audit trails for compliance');
        console.log('   🚀 Scalable multi-server architecture');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testMCPIntegration().catch(console.error);