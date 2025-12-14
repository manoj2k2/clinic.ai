/**
 * Simplified LangChain-based Healthcare AI Agent Service
 *
 * Uses LangChain tools and LLM for healthcare assistance without complex agent orchestration
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Tool } from '@langchain/core/tools';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { FhirClientService } from './fhir-client.service';
import { UserPatientMappingModel } from '../models/user-patient-mapping.model';
import { HealthcareModel } from '../models/healthcare.model';

export interface LangChainHealthcareContext {
  userId?: string;
  sessionId: string;
  patientId?: string;
  conversationHistory?: Array<HumanMessage | AIMessage>;
}

export interface LangChainHealthcareResponse {
  success: boolean;
  response: string;
  actions?: HealthcareAction[];
  metadata?: any;
  toolCalls?: any[];
}

export interface HealthcareAction {
  type: 'screening_complete' | 'appointment_booked' | 'practitioner_recommended' | 'emergency_detected';
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * FHIR Patient Data Tool
 * Retrieves patient information from FHIR server
 */
class FHIRPatientTool extends Tool {
  name = 'fhir_patient_lookup';
  description = 'Look up patient information from FHIR server. Input should be a patient ID.';

  constructor(private fhirClient: FhirClientService) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const patient = await this.fhirClient.getPatient(input.trim());
      return JSON.stringify({
        id: patient.id,
        name: patient.name?.[0] ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : 'Unknown',
        gender: patient.gender,
        birthDate: patient.birthDate,
        telecom: patient.telecom,
        address: patient.address
      });
    } catch (error) {
      return `Error retrieving patient data: ${(error as Error).message}`;
    }
  }
}

/**
 * FHIR Appointments Tool
 * Retrieves patient appointments from FHIR server
 */
class FHIRAppointmentsTool extends Tool {
  name = 'fhir_appointments_lookup';
  description = 'Look up patient appointments from FHIR server. Input should be a patient ID.';

  constructor(private fhirClient: FhirClientService) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const appointments = await this.fhirClient.getPatientAppointments(input.trim());
      return JSON.stringify(appointments.map(apt => ({
        id: apt.id,
        status: apt.status,
        start: apt.start,
        description: apt.description,
        participant: apt.participant
      })));
    } catch (error) {
      return `Error retrieving appointments: ${(error as Error).message}`;
    }
  }
}

/**
 * Symptom Screening Tool
 * Analyzes symptoms and provides triage recommendations
 */
class SymptomScreeningTool extends Tool {
  name = 'symptom_screening';
  description = 'Analyze patient symptoms and provide triage recommendations. Input should be a description of symptoms.';

  async _call(input: string): Promise<string> {
    const symptoms = this.extractSymptoms(input);
    const severity = this.assessSeverity(symptoms, input);
    const recommendations = this.generateRecommendations(severity, symptoms);

    return JSON.stringify({
      symptoms,
      severity,
      duration: this.extractDuration(input),
      riskFactors: this.extractRiskFactors(input),
      recommendations,
      urgency: severity === 'emergency' ? 'immediate' : severity === 'severe' ? 'urgent' : 'routine'
    });
  }

  private extractSymptoms(message: string): string[] {
    const symptomPatterns = [
      /pain|ache|hurts/g,
      /fever|temperature/g,
      /cough|coughing/g,
      /headache|head pain/g,
      /nausea|vomiting/g,
      /dizziness|giddy/g,
      /shortness of breath|breathing difficulty/g,
      /chest pain/g
    ];

    const symptoms: string[] = [];
    for (const pattern of symptomPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        symptoms.push(...matches);
      }
    }

    return [...new Set(symptoms)];
  }

  private assessSeverity(symptoms: string[], message: string): 'mild' | 'moderate' | 'severe' | 'emergency' {
    const emergencySymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious'];
    const severeSymptoms = ['high fever', 'severe pain', 'confusion', 'seizure'];

    if (emergencySymptoms.some(s => message.toLowerCase().includes(s))) {
      return 'emergency';
    }

    if (severeSymptoms.some(s => message.toLowerCase().includes(s))) {
      return 'severe';
    }

    if (symptoms.length > 2) {
      return 'moderate';
    }

    return 'mild';
  }

  private extractDuration(message: string): string {
    const durationPatterns = [
      /(\d+)\s*(day|days|week|weeks|hour|hours|minute|minutes)/g,
      /(since|for)\s*(yesterday|today|this morning|last night)/g
    ];

    for (const pattern of durationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'unknown';
  }

  private extractRiskFactors(message: string): string[] {
    const riskFactors: string[] = [];
    const riskKeywords = ['pregnant', 'diabetic', 'heart condition', 'asthma', 'allergic'];

    for (const keyword of riskKeywords) {
      if (message.toLowerCase().includes(keyword)) {
        riskFactors.push(keyword);
      }
    }

    return riskFactors;
  }

  private generateRecommendations(severity: string, symptoms: string[]): string[] {
    const recommendations: string[] = [];

    switch (severity) {
      case 'emergency':
        recommendations.push('CALL 911 IMMEDIATELY or go to the nearest emergency room');
        break;
      case 'severe':
        recommendations.push('Seek immediate medical attention at urgent care or ER');
        recommendations.push('Do not delay - these symptoms require prompt evaluation');
        break;
      case 'moderate':
        recommendations.push('Schedule an appointment with your primary care provider within 1-2 days');
        recommendations.push('Monitor your symptoms and seek immediate care if they worsen');
        break;
      case 'mild':
        recommendations.push('Schedule a routine appointment with your healthcare provider');
        recommendations.push('Practice self-care measures like rest, hydration, and over-the-counter medications if appropriate');
        break;
    }

    return recommendations;
  }
}

/**
 * Appointment Booking Tool
 * Books appointments with healthcare providers
 */
class AppointmentBookingTool extends Tool {
  name = 'appointment_booking';
  description = 'Book an appointment with a healthcare provider. Input should be JSON with patientId, specialty, urgency, and preferredDate.';

  constructor(private healthcareAgent: LangChainHealthcareAgentService) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const bookingData = JSON.parse(input);
      const appointment = await this.healthcareAgent.bookAppointment(bookingData);

      return JSON.stringify({
        success: true,
        appointment: {
          id: appointment.id,
          status: appointment.status,
          start: appointment.start,
          practitioner: appointment.practitioner,
          patient: appointment.patient,
          reason: appointment.reason
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to book appointment: ${(error as Error).message}`
      });
    }
  }
}

/**
 * Practitioner Lookup Tool
 * Finds available healthcare practitioners
 */
class PractitionerLookupTool extends Tool {
  name = 'practitioner_lookup';
  description = 'Find available healthcare practitioners by specialty. Input should be a medical specialty.';

  constructor(private healthcareAgent: LangChainHealthcareAgentService) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const practitioners = await this.healthcareAgent.getAvailablePractitioners(input.trim());
      return JSON.stringify(practitioners);
    } catch (error) {
      return `Error finding practitioners: ${(error as Error).message}`;
    }
  }
}

/**
 * Emergency Detection Tool
 * Detects emergency situations and provides immediate guidance
 */
class EmergencyDetectionTool extends Tool {
  name = 'emergency_detection';
  description = 'Detect and respond to medical emergencies. Input should be a description of symptoms or situation.';

  async _call(input: string): Promise<string> {
    const emergencyKeywords = ['emergency', '911', 'chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding'];

    const detected = emergencyKeywords.some(keyword => input.toLowerCase().includes(keyword));

    if (detected) {
      return JSON.stringify({
        emergency: true,
        action: 'CALL 911 IMMEDIATELY',
        guidance: 'Do not wait. Call emergency services right now or go to the nearest emergency room.',
        keywords: emergencyKeywords.filter(k => input.toLowerCase().includes(k))
      });
    }

    return JSON.stringify({
      emergency: false,
      guidance: 'This does not appear to be an immediate emergency, but please seek medical attention if symptoms persist or worsen.'
    });
  }
}

/**
 * Simplified LangChain-based Healthcare Agent Service
 */
export class LangChainHealthcareAgentService {
  private llm: ChatOpenAI | ChatGoogleGenerativeAI;
  private fhirClient: FhirClientService;
  private tools: Tool[];

  constructor() {
    this.fhirClient = new FhirClientService();
    this.llm = this.initializeLLM();
    this.tools = this.initializeTools();
  }

  /**
   * Initialize the appropriate LLM based on environment configuration
   */
  private initializeLLM(): ChatOpenAI | ChatGoogleGenerativeAI {
    const provider = process.env.AI_PROVIDER || 'gemini';
    console.log(`🤖 Initializing LLM with provider: ${provider}`);

    if (provider === 'openai') {
      console.log('🔑 Using OpenAI with API key:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
      });
    } else {
      console.log('🔑 Using Gemini with API key:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        temperature: 0.7,
      });
    }
  }

  /**
   * Initialize healthcare-specific tools
   */
  private initializeTools(): Tool[] {
    return [
      new FHIRPatientTool(this.fhirClient),
      new FHIRAppointmentsTool(this.fhirClient),
      new SymptomScreeningTool(),
      new AppointmentBookingTool(this),
      new PractitionerLookupTool(this),
      new EmergencyDetectionTool(),
    ];
  }

  /**
   * Determine which tools to call based on the message
   */
  private async determineToolCalls(message: string, enhancedPrompt: string): Promise<string[]> {
    const toolCalls: string[] = [];

    // Simple rule-based tool selection (can be enhanced with LLM reasoning)
    const lowerMessage = message.toLowerCase();

    // Emergency detection
    if (lowerMessage.includes('emergency') || lowerMessage.includes('chest pain') ||
        lowerMessage.includes('difficulty breathing') || lowerMessage.includes('unconscious')) {
      toolCalls.push('emergency_detection');
    }

    // Symptom screening
    if (this.hasSymptoms(message)) {
      toolCalls.push('symptom_screening');
    }

    // Appointment booking
    if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') ||
        lowerMessage.includes('book') || lowerMessage.includes('see doctor')) {
      toolCalls.push('appointment_booking');
      toolCalls.push('practitioner_lookup');
    }

    // Patient data lookup
    if (lowerMessage.includes('my appointments') || lowerMessage.includes('show appointments')) {
      toolCalls.push('fhir_appointments_lookup');
    }

    return toolCalls;
  }

  /**
   * Execute the determined tools
   */
  private async executeTools(toolNames: string[], context: LangChainHealthcareContext): Promise<any[]> {
    const results: any[] = [];

    for (const toolName of toolNames) {
      try {
        console.log(`🔧 Executing tool: ${toolName}`);
        const tool = this.tools.find(t => t.name === toolName);
        if (tool) {
          let input = '';

          // Determine appropriate input for each tool
          switch (toolName) {
            case 'fhir_patient_lookup':
            case 'fhir_appointments_lookup':
              input = context.patientId || 'unknown';
              break;
            case 'practitioner_lookup':
              input = 'primary care'; // Default specialty
              break;
            case 'appointment_booking':
              input = JSON.stringify({
                patientId: context.patientId,
                reason: 'General consultation',
                specialty: 'primary care'
              });
              break;
            default:
              input = 'Please analyze this health concern';
          }

          console.log(`📝 Tool input: ${input}`);
          // Try different methods to call the tool
          let result;
          try {
            // Try invoke method first (LangChain v0.1+)
            result = await (tool as any).invoke({ input });
          } catch (invokeError) {
            try {
              // Try call method
              result = await (tool as any).call(input);
            } catch (callError) {
              console.log(`⚠️ Both invoke and call failed, trying _call: ${(callError as Error).message}`);
              // Last resort - use _call (may not work due to protection)
              result = await (tool as any)._call(input);
            }
          }

          console.log(`✅ Tool result: ${JSON.stringify(result)}`);
          results.push({ tool: toolName, result, success: true });
        } else {
          console.log(`❌ Tool not found: ${toolName}`);
        }
      } catch (error) {
        console.error(`❌ Tool execution error for ${toolName}:`, error);
        results.push({ tool: toolName, error: (error as Error).message, success: false });
      }
    }

    return results;
  }

  /**
   * Generate final response using LLM with tool results
   */
  private async generateResponse(message: string, toolResults: any[], patientContext: any): Promise<string> {
    const systemPrompt = `You are an advanced healthcare AI assistant for Clinic.AI.

Available tool results: ${JSON.stringify(toolResults)}

Patient context: ${patientContext ? JSON.stringify(patientContext) : 'No patient context available'}

Guidelines:
- Use tool results to provide accurate, helpful responses
- Be empathetic and professional
- For emergencies: Always recommend immediate medical attention
- For appointments: Help coordinate scheduling
- Keep responses clear and actionable
- Never diagnose conditions - only assess urgency and recommend professional evaluation

Respond to: "${message}"`;

    try {
      console.log('🤖 Generating LLM response...');
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(message)
      ];

      const response = await this.llm.invoke(messages);
      const responseText = response.content as string;
      console.log(`💬 LLM Response: ${responseText.substring(0, 100)}...`);
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
   * Infer medical specialty from recent message
   */
  private inferSpecialtyFromMessage(message: string): string {
    const specialtyMap: { [key: string]: string } = {
      'heart|chest|cardiac': 'cardiology',
      'skin|rash|dermatitis': 'dermatology',
      'eye|vision|ophthalmology': 'ophthalmology',
      'mental|depression|anxiety': 'psychiatry',
      'pregnant|obstetrics': 'obstetrics',
      'bone|joint|orthopedic': 'orthopedics',
      'child|pediatric': 'pediatrics'
    };

    for (const [pattern, specialty] of Object.entries(specialtyMap)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return specialty;
      }
    }

    return 'primary care';
  }

  /**
   * Process healthcare-related messages using LangChain tools
   */
  async processHealthcareMessage(
    message: string,
    context: LangChainHealthcareContext
  ): Promise<LangChainHealthcareResponse> {
    try {
      // Get patient context if user is mapped to patients
      const patientContext = await this.getPatientContext(context.userId);

      // Build enhanced prompt with patient context
      const enhancedPrompt = await this.buildEnhancedPrompt(message, context, patientContext);

      // Use LLM to determine which tools to call
      const toolCalls = await this.determineToolCalls(message, enhancedPrompt);

      // Execute the determined tools
      const toolResults = await this.executeTools(toolCalls, context);

      // Generate final response using LLM with tool results
      const finalResponse = await this.generateResponse(message, toolResults, patientContext);

      // Analyze response for healthcare actions
      const actions = await this.analyzeResponseForActions(finalResponse, message, context);

      // Store healthcare metadata if needed
      if (actions.length > 0) {
        await this.storeHealthcareMetadata(context.sessionId, {
          actions,
          patientContext,
          timestamp: new Date().toISOString(),
          toolCalls,
        });
      }

      return {
        success: true,
        response: finalResponse,
        actions,
        metadata: {
          patientContext,
          actionsPerformed: actions.length,
          toolCalls: toolCalls.length,
        },
        toolCalls,
      };

    } catch (error) {
      console.error('LangChain Healthcare Agent Error:', error);
      return {
        success: false,
        response: 'I\'m experiencing technical difficulties. Please contact clinic staff for assistance.',
        metadata: { error: (error as Error).message }
      };
    }
  }

  /**
   * Build enhanced prompt with patient context and healthcare focus
   */
  private async buildEnhancedPrompt(
    message: string,
    context: LangChainHealthcareContext,
    patientContext: any
  ): Promise<string> {
    let prompt = message;

    if (patientContext) {
      prompt += `\n\nPATIENT CONTEXT:
- Patient: ${patientContext.patientName}
- Patient ID: ${patientContext.patientId}
- You have access to their medical records for appointment scheduling and care coordination
- Always verify patient identity before discussing sensitive information`;
    }

    // Add healthcare intent detection
    const healthcareIntents = this.detectHealthcareIntent(message);
    if (healthcareIntents.length > 0) {
      prompt += `\n\nDETECTED HEALTHCARE INTENTS: ${healthcareIntents.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Detect healthcare-related intents in the message
   */
  private detectHealthcareIntent(message: string): string[] {
    const intents: string[] = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('book')) {
      intents.push('appointment_booking');
    }

    if (lowerMessage.includes('pain') || lowerMessage.includes('fever') || lowerMessage.includes('cough') ||
        lowerMessage.includes('headache') || lowerMessage.includes('symptom')) {
      intents.push('symptom_assessment');
    }

    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') ||
        lowerMessage.includes('chest pain') || lowerMessage.includes('breathing')) {
      intents.push('emergency_check');
    }

    if (lowerMessage.includes('doctor') || lowerMessage.includes('practitioner') ||
        lowerMessage.includes('specialist')) {
      intents.push('practitioner_lookup');
    }

    return intents;
  }

  /**
   * Analyze agent response for healthcare actions
   */
  private async analyzeResponseForActions(
    response: string,
    originalMessage: string,
    context: LangChainHealthcareContext
  ): Promise<HealthcareAction[]> {
    const actions: HealthcareAction[] = [];

    // Check for emergency keywords in response
    const emergencyKeywords = ['emergency', '911', 'chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding'];
    if (emergencyKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
      actions.push({
        type: 'emergency_detected',
        data: { detected: true, keywords: emergencyKeywords.filter(k => response.toLowerCase().includes(k)) },
        priority: 'urgent'
      });
    }

    // Check for appointment booking intent
    const appointmentKeywords = ['appointment', 'schedule', 'book', 'see doctor', 'make appointment'];
    if (appointmentKeywords.some(keyword => originalMessage.toLowerCase().includes(keyword))) {
      actions.push({
        type: 'appointment_booked',
        data: await this.extractAppointmentData(originalMessage, context),
        priority: 'medium'
      });
    }

    // Check for symptom screening
    const symptomKeywords = ['pain', 'fever', 'cough', 'headache', 'nausea', 'symptoms', 'feeling'];
    if (symptomKeywords.some(keyword => originalMessage.toLowerCase().includes(keyword))) {
      const screeningData = await this.performSymptomScreening(originalMessage);
      if (screeningData) {
        actions.push({
          type: 'screening_complete',
          data: screeningData,
          priority: screeningData.severity === 'emergency' ? 'urgent' :
                   screeningData.severity === 'severe' ? 'high' : 'medium'
        });
      }
    }

    return actions;
  }

  /**
   * Get patient context for user
   */
  private async getPatientContext(userId?: string): Promise<any> {
    if (!userId) return null;

    try {
      const patientIds = await UserPatientMappingModel.getPatientsByUser(userId);
      if (patientIds.length === 0) return null;

      // Get primary patient data
      const primaryPatientId = patientIds[0];
      const patient = await this.fhirClient.getPatient(primaryPatientId);

      return {
        patientId: primaryPatientId,
        patientName: this.getPatientDisplayName(patient),
        patientData: patient,
        accessiblePatients: patientIds.length
      };
    } catch (error) {
      console.warn('Could not load patient context:', error);
      return null;
    }
  }

  /**
   * Extract appointment booking data from message
   */
  private async extractAppointmentData(message: string, context: LangChainHealthcareContext): Promise<any> {
    return {
      patientId: context.patientId || 'unknown',
      urgency: 'routine',
      reason: message,
      specialty: this.inferSpecialty(message)
    };
  }

  /**
   * Perform symptom screening analysis
   */
  private async performSymptomScreening(message: string): Promise<any> {
    const symptoms = this.extractSymptoms(message);
    if (symptoms.length === 0) return null;

    const severity = this.assessSeverity(symptoms, message);

    return {
      symptoms,
      severity,
      duration: this.extractDuration(message),
      riskFactors: this.extractRiskFactors(message),
      recommendations: this.generateRecommendations(severity, symptoms)
    };
  }

  /**
   * Extract symptoms from message
   */
  private extractSymptoms(message: string): string[] {
    const symptomPatterns = [
      /pain|ache|hurts/g,
      /fever|temperature/g,
      /cough|coughing/g,
      /headache|head pain/g,
      /nausea|vomiting/g,
      /dizziness|giddy/g,
      /shortness of breath|breathing difficulty/g,
      /chest pain/g
    ];

    const symptoms: string[] = [];
    for (const pattern of symptomPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        symptoms.push(...matches);
      }
    }

    return [...new Set(symptoms)];
  }

  /**
   * Assess symptom severity
   */
  private assessSeverity(symptoms: string[], message: string): 'mild' | 'moderate' | 'severe' | 'emergency' {
    const emergencySymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious'];
    const severeSymptoms = ['high fever', 'severe pain', 'confusion', 'seizure'];

    if (emergencySymptoms.some(s => message.toLowerCase().includes(s))) {
      return 'emergency';
    }

    if (severeSymptoms.some(s => message.toLowerCase().includes(s))) {
      return 'severe';
    }

    if (symptoms.length > 2) {
      return 'moderate';
    }

    return 'mild';
  }

  /**
   * Extract duration information
   */
  private extractDuration(message: string): string {
    const durationPatterns = [
      /(\d+)\s*(day|days|week|weeks|hour|hours|minute|minutes)/g,
      /(since|for)\s*(yesterday|today|this morning|last night)/g
    ];

    for (const pattern of durationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'unknown';
  }

  /**
   * Extract risk factors
   */
  private extractRiskFactors(message: string): string[] {
    const riskFactors: string[] = [];
    const riskKeywords = ['pregnant', 'diabetic', 'heart condition', 'asthma', 'allergic'];

    for (const keyword of riskKeywords) {
      if (message.toLowerCase().includes(keyword)) {
        riskFactors.push(keyword);
      }
    }

    return riskFactors;
  }

  /**
   * Generate recommendations based on severity
   */
  private generateRecommendations(severity: string, symptoms: string[]): string[] {
    const recommendations: string[] = [];

    switch (severity) {
      case 'emergency':
        recommendations.push('CALL 911 IMMEDIATELY or go to the nearest emergency room');
        break;
      case 'severe':
        recommendations.push('Seek immediate medical attention at urgent care or ER');
        recommendations.push('Do not delay - these symptoms require prompt evaluation');
        break;
      case 'moderate':
        recommendations.push('Schedule an appointment with your primary care provider within 1-2 days');
        recommendations.push('Monitor your symptoms and seek immediate care if they worsen');
        break;
      case 'mild':
        recommendations.push('Schedule a routine appointment with your healthcare provider');
        recommendations.push('Practice self-care measures like rest, hydration, and over-the-counter medications if appropriate');
        break;
    }

    return recommendations;
  }

  /**
   * Infer medical specialty from message
   */
  private inferSpecialty(message: string): string {
    const specialtyMap: { [key: string]: string } = {
      'heart|chest|cardiac': 'cardiology',
      'skin|rash|dermatitis': 'dermatology',
      'eye|vision|ophthalmology': 'ophthalmology',
      'mental|depression|anxiety': 'psychiatry',
      'pregnant|obstetrics': 'obstetrics',
      'bone|joint|orthopedic': 'orthopedics',
      'child|pediatric': 'pediatrics'
    };

    for (const [pattern, specialty] of Object.entries(specialtyMap)) {
      if (new RegExp(pattern, 'i').test(message)) {
        return specialty;
      }
    }

    return 'primary care';
  }

  /**
   * Get patient display name
   */
  private getPatientDisplayName(patient: any): string {
    if (!patient.name || patient.name.length === 0) {
      return 'Patient';
    }
    const name = patient.name[0];
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim() || 'Patient';
  }

  /**
   * Store healthcare-specific metadata
   */
  private async storeHealthcareMetadata(sessionId: string, metadata: any): Promise<void> {
    try {
      console.log('🗄️ Storing healthcare metadata:', metadata);
      // This would integrate with HealthcareModel if available
    } catch (error) {
      console.warn('Could not store healthcare metadata:', error);
    }
  }

  /**
   * Get available practitioners for appointment booking
   */
  async getAvailablePractitioners(specialty?: string): Promise<any[]> {
    try {
      // This would query FHIR for practitioners
      // For now, return mock data
      return [
        {
          id: 'practitioner-1',
          name: 'Dr. Sarah Johnson',
          specialty: specialty || 'primary care',
          available: true
        },
        {
          id: 'practitioner-2',
          name: 'Dr. Michael Chen',
          specialty: 'cardiology',
          available: specialty === 'cardiology' || !specialty
        }
      ];
    } catch (error) {
      console.error('Error getting practitioners:', error);
      return [];
    }
  }

  /**
   * Book appointment through FHIR
   */
  async bookAppointment(bookingData: any): Promise<any> {
    try {
      // This would create an appointment resource in FHIR
      // For now, return mock response
      return {
        id: 'appointment-' + Date.now(),
        status: 'booked',
        start: bookingData.preferredDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        practitioner: bookingData.practitionerId || 'practitioner-1',
        patient: bookingData.patientId,
        reason: bookingData.reason
      };
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }
}