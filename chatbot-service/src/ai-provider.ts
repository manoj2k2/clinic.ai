import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// AI Provider Type
type AIProvider = 'openai' | 'gemini';

export interface AIMessage {
  role: string;
  content: string;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
}

// System instruction for medical assistant
const SYSTEM_PROMPT = `You are a helpful and empathetic medical assistant for Clinic.AI. 

Your role:
- Help patients with general health questions
- Collect symptoms for screening
- Provide appointment booking assistance
- Offer health education and guidance

Guidelines:
- Be professional, warm, and empathetic
- Keep responses concise (2-3 sentences)
- Never diagnose - only help assess urgency
- For emergencies, immediately advise calling 911 or going to ER
- Respect patient privacy and HIPAA guidelines
- If unsure, suggest speaking with a healthcare provider

Remember: You're here to help, not to replace a doctor.`;

// Get AI provider from environment
function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'openai' || provider === 'gemini') {
    return provider;
  }
  console.warn(`Unknown AI_PROVIDER: ${provider}, defaulting to gemini`);
  return 'gemini';
}

// OpenAI Implementation
async function chatWithOpenAI(message: string, history: AIMessage[] = []): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Build messages array for OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add conversation history
  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }
  }

  // Add current message
  messages.push({
    role: 'user',
    content: message
  });

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 0.9,
  });

  const response = completion.choices[0]?.message?.content || '';
  return {
    success: true,
    response
  };
}

// Google Gemini Implementation
async function chatWithGemini(message: string, history: AIMessage[] = []): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.9,
    }
  });

  // Build conversation history for Gemini
  const geminiHistory = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    },
    {
      role: 'model',
      parts: [{ text: 'I understand. I will be a helpful, professional, and empathetic medical assistant while staying within appropriate boundaries.' }]
    }
  ];

  // Add previous messages from conversation
  for (const msg of history) {
    if (msg.role === 'user') {
      geminiHistory.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === 'assistant') {
      geminiHistory.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  }

  // Start chat with history
  const chat = model.startChat({
    history: geminiHistory
  });

  // Send current message
  const result = await chat.sendMessage(message);
  const response = result.response.text();

  return { 
    success: true, 
    response 
  };
}

// Main chat function that routes to the appropriate provider
export async function chatWithAI(message: string, history: AIMessage[] = []): Promise<AIResponse> {
  const provider = getAIProvider();
  
  try {
    console.log(`🤖 Using AI Provider: ${provider}`);
    
    if (provider === 'openai') {
      return await chatWithOpenAI(message, history);
    } else {
      return await chatWithGemini(message, history);
    }
  } catch (error: any) {
    console.error('AI Error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('API_KEY') || error.message?.includes('not configured')) {
      return { 
        success: false, 
        response: 'Sorry, the AI service is not properly configured. Please contact support.',
        error: 'Invalid or missing API key'
      };
    }
    
    if (error.status === 429) {
      return {
        success: false,
        response: 'The AI service is currently busy. Please try again in a moment.',
        error: 'Rate limit exceeded'
      };
    }
    
    return { 
      success: false, 
      response: 'Sorry, I encountered an error. Please try again.',
      error: error.message || String(error)
    };
  }
}

// Test AI connection
export async function testAI(): Promise<boolean> {
  try {
    const result = await chatWithAI('Hello, this is a test.');
    return result.success;
  } catch (error) {
    console.error('AI test failed:', error);
    return false;
  }
}

// Export provider info for debugging
export function getProviderInfo() {
  const provider = getAIProvider();
  return {
    provider,
    model: provider === 'openai' 
      ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
      : process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    configured: provider === 'openai' 
      ? !!process.env.OPENAI_API_KEY 
      : !!process.env.GEMINI_API_KEY
  };
}
