/**
 * MCP Integration for LangChain Healthcare Agent
 *
 * This shows how to integrate MCP servers with the LangChain healthcare agent
 * for enhanced security, standardization, and interoperability.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool, Tool } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPHealthcareContext {
  userId?: string;
  sessionId: string;
  patientId?: string;
  mcpServers: string[]; // List of MCP server endpoints
}

/**
 * Create MCP Tool Wrapper
 * Creates LangChain tools from MCP server tools
 */
function createMCPTool(mcpClient: Client, toolName: string, toolDescription: string): Tool {
  return {
    name: toolName,
    description: toolDescription,
    call: async (input: any) => {
      try {
        const result = await mcpClient.request(
          {
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: typeof input === 'string' ? JSON.parse(input) : input
            }
          },
          {} as any,
          {} as any
        );

        return JSON.stringify(result);
      } catch (error) {
        console.error(`MCP tool call failed:`, error);
        throw error;
      }
    }
  } as Tool;
}

/**
 * MCP-Enhanced Healthcare Agent
 * Uses MCP servers for secure, standardized healthcare tool access
 */
export class MCPHealthcareAgentService {
  private llm: ChatOpenAI | ChatGoogleGenerativeAI;
  private mcpClients: Map<string, Client> = new Map();
  private tools: Tool[] = [];

  constructor() {
    this.llm = this.initializeLLM();
  }

  /**
   * Initialize LLM
   */
  private initializeLLM(): ChatOpenAI | ChatGoogleGenerativeAI {
    const provider = process.env.AI_PROVIDER || 'openai';

    if (provider === 'openai') {
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
      });
    } else {
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        temperature: 0.7,
      });
    }
  }

  /**
   * Connect to MCP servers
   */
  async connectMCPServers(serverConfigs: Array<{ name: string; command: string; args: string[] }>) {
    for (const config of serverConfigs) {
      try {
        console.log(`🔗 Connecting to MCP server: ${config.name}`);

        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args
        });

        const client = new Client(
          {
            name: `healthcare-agent-${config.name}`,
            version: '1.0.0'
          },
          {
            capabilities: {}
          }
        );

        await client.connect(transport);
        this.mcpClients.set(config.name, client);

        // Load tools from this MCP server
        await this.loadMCPTools(config.name, client);

        console.log(`✅ Connected to MCP server: ${config.name}`);
      } catch (error) {
        console.error(`❌ Failed to connect to MCP server ${config.name}:`, error);
      }
    }
  }

  /**
   * Load tools from MCP server
   */
  private async loadMCPTools(serverName: string, client: Client) {
    try {
      const toolsResponse = await client.request(
        { method: 'tools/list', params: {} },
        {} as any,
        {} as any
      );

      for (const tool of toolsResponse.tools) {
        const wrappedTool = createMCPTool(
          client,
          tool.name,
          tool.description
        );

        this.tools.push(wrappedTool);
        console.log(`🔧 Loaded MCP tool: ${tool.name} from ${serverName}`);
      }
    } catch (error) {
      console.error(`Failed to load tools from MCP server ${serverName}:`, error);
    }
  }

  /**
   * Process healthcare message using MCP tools
   */
  async processHealthcareMessage(
    message: string,
    context: MCPHealthcareContext
  ): Promise<any> {
    try {
      // Determine which tools to use based on message content
      const toolCalls = this.determineToolCalls(message, context);

      // Execute tools via MCP
      const toolResults = await this.executeMCPTools(toolCalls, context);

      // Generate response using LLM with tool results
      const response = await this.generateResponse(message, toolResults, context);

      return {
        success: true,
        response,
        toolResults,
        mcpServers: context.mcpServers
      };

    } catch (error) {
      console.error('MCP Healthcare Agent Error:', error);
      return {
        success: false,
        response: 'I\'m experiencing technical difficulties. Please contact clinic staff for assistance.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Determine which tools to call based on message
   */
  private determineToolCalls(message: string, context: MCPHealthcareContext): string[] {
    const toolCalls: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Emergency detection
    if (lowerMessage.includes('emergency') || lowerMessage.includes('chest pain') ||
        lowerMessage.includes('difficulty breathing') || lowerMessage.includes('unconscious')) {
      toolCalls.push('emergency_detection');
    }

    // Symptom assessment
    if (this.hasSymptoms(message)) {
      toolCalls.push('symptom_assessment');
    }

    // Appointment booking
    if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') ||
        lowerMessage.includes('book') || lowerMessage.includes('see doctor')) {
      toolCalls.push('appointment_booking');
      toolCalls.push('practitioner_search');
    }

    // Patient data lookup
    if (lowerMessage.includes('my appointments') || lowerMessage.includes('show appointments')) {
      toolCalls.push('fhir_appointments_lookup');
    }

    return toolCalls;
  }

  /**
   * Execute tools via MCP servers
   */
  private async executeMCPTools(toolNames: string[], context: MCPHealthcareContext): Promise<any[]> {
    const results: any[] = [];

    for (const toolName of toolNames) {
      try {
        console.log(`🔧 Executing MCP tool: ${toolName}`);

        // Find which MCP server has this tool
        const tool = this.tools.find(t => t.name === toolName);
        if (!tool) {
          console.log(`❌ Tool not found: ${toolName}`);
          continue;
        }

        // Prepare tool arguments with context
        const args = this.prepareToolArguments(toolName, context);

        // Execute tool
        const result = await tool.call(args);
        const parsedResult = JSON.parse(result);

        results.push({
          tool: toolName,
          result: parsedResult,
          success: true
        });

        console.log(`✅ MCP tool result: ${toolName}`);

      } catch (error) {
        console.error(`❌ MCP tool execution error for ${toolName}:`, error);
        results.push({
          tool: toolName,
          error: (error as Error).message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Prepare arguments for tool execution
   */
  private prepareToolArguments(toolName: string, context: MCPHealthcareContext): any {
    const baseArgs = {
      userId: context.userId,
      patientId: context.patientId
    };

    switch (toolName) {
      case 'fhir_patient_lookup':
      case 'fhir_appointments_lookup':
        return {
          ...baseArgs,
          patientId: context.patientId || 'unknown'
        };

      case 'appointment_booking':
        return {
          ...baseArgs,
          specialty: 'primary care',
          urgency: 'routine'
        };

      case 'practitioner_search':
        return {
          specialty: 'primary care',
          availability: 'this-week'
        };

      case 'symptom_assessment':
        return {
          ...baseArgs,
          symptoms: 'General health inquiry' // Would be extracted from message
        };

      case 'emergency_detection':
        return {
          text: 'Health concern', // Would be the actual message
          patientId: context.patientId
        };

      default:
        return baseArgs;
    }
  }

  /**
   * Generate response using LLM
   */
  private async generateResponse(message: string, toolResults: any[], context: MCPHealthcareContext): Promise<string> {
    const systemPrompt = `You are an advanced healthcare AI assistant using MCP (Model Context Protocol) for secure access to healthcare tools and data.

MCP Tool Results: ${JSON.stringify(toolResults)}

Guidelines:
- Use MCP tool results to provide accurate, helpful responses
- Respect HIPAA and healthcare privacy regulations
- Be empathetic and professional
- For emergencies: Always recommend immediate medical attention
- Tools were executed securely via MCP servers

Respond to: "${message}"`;

    try {
      console.log('🤖 Generating LLM response with MCP results...');

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(message)
      ];

      const response = await this.llm.invoke(messages);
      const responseText = response.content as string;

      console.log(`💬 MCP-enhanced response generated`);
      return responseText;

    } catch (error) {
      console.error('❌ LLM response generation error:', error);
      return 'I apologize, but I\'m having trouble processing your request. Please contact clinic staff for assistance.';
    }
  }

  /**
   * Check if message contains symptoms
   */
  private hasSymptoms(message: string): boolean {
    const symptomKeywords = [
      'pain', 'ache', 'hurt', 'fever', 'cough', 'headache', 'nausea',
      'dizzy', 'chest pain', 'shortness of breath', 'vomiting', 'diarrhea'
    ];

    return symptomKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Disconnect from MCP servers
   */
  async disconnect() {
    for (const [name, client] of this.mcpClients) {
      try {
        await client.close();
        console.log(`🔌 Disconnected from MCP server: ${name}`);
      } catch (error) {
        console.error(`Error disconnecting from MCP server ${name}:`, error);
      }
    }
    this.mcpClients.clear();
  }
}

/**
 * Example usage and configuration
 */
export const mcpHealthcareConfig = {
  // MCP server configurations
  servers: [
    {
      name: 'fhir-server',
      command: 'node',
      args: ['dist/services/patient-mcp-server.js']
    },
    // Could add more MCP servers for different healthcare systems
    // {
    //   name: 'imaging-server',
    //   command: 'python',
    //   args: ['-m', 'imaging_mcp_server']
    // },
    // {
    //   name: 'pharmacy-server',
    //   command: 'node',
    //   args: ['dist/services/pharmacy-mcp-server.js']
    // }
  ],

  // Usage example
  async example() {
    const agent = new MCPHealthcareAgentService();

    // Connect to MCP servers
    await agent.connectMCPServers(mcpHealthcareConfig.servers);

    try {
      // Process healthcare message using MCP tools
      const response = await agent.processHealthcareMessage(
        "I have a headache and want to schedule an appointment",
        {
          userId: 'user-123',
          sessionId: 'session-456',
          patientId: 'patient-789',
          mcpServers: ['fhir-server']
        }
      );

      console.log('MCP Healthcare Response:', response);
    } finally {
      // Clean up connections
      await agent.disconnect();
    }
  }
};