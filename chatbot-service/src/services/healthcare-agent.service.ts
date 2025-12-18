/**
 * Healthcare AI Agent Service
 *
 * Specialized AI agent for patient screening, appointment booking, and front desk assistance.
 * Integrates with FHIR client service to access patient and practitioner data.
 */

import { chatWithAI, AIMessage } from '../ai-provider';
import { FhirClientService } from './fhir-client.service';
import { UserPatientMappingModel } from '../models/user-patient-mapping.model';

export interface HealthcareAgentContext {
  userId?: string;
  sessionId: string;
  patientId?: string;
  conversationHistory?: AIMessage[];
}

export interface HealthcareAgentResponse {
  success: boolean;
  response: string;
  actions?: HealthcareAction[];
  metadata?: any;
}

export interface HealthcareAction {
  type: 'screening_complete' | 'appointment_booked' | 'practitioner_recommended' | 'emergency_detected';
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface PatientScreeningData {
  symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe' | 'emergency';
  duration: string;
  riskFactors: string[];
  recommendations: string[];
}

export interface AppointmentBookingData {
  patientId: string;
  practitionerId?: string;
  specialty?: string;
  urgency: 'routine' | 'urgent' | 'asap';
  preferredDate?: string;
  reason: string;
}

export class HealthcareAgentService {
  private fhirClient: FhirClientService;

  constructor() {
    this.fhirClient = new FhirClientService();
  }

  /**
   * Process healthcare-related messages with specialized AI agent
   */
  async processHealthcareMessage(
    message: string,
    context: HealthcareAgentContext
  ): Promise<HealthcareAgentResponse> {
    try {
      // Get patient context if user is mapped to patients
      const patientContext = await this.getPatientContext(context.userId);

      // Build specialized healthcare prompt (using refined prompt V2)
      const systemPrompt = this.buildHealthcarePromptV2(context, patientContext);

      // Get conversation history with healthcare context
      const history = context.conversationHistory || [];

      // Add current context to history
      const fullHistory: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ];

      // Get AI response with healthcare specialization
      const aiResponse = await chatWithAI(message, fullHistory);

      if (!aiResponse.success) {
        return {
          success: false,
          response: 'I apologize, but I\'m having trouble processing your request right now. Please try again.',
          metadata: { error: aiResponse.error }
        };
      }

      // Analyze response for healthcare actions
      const actions = await this.analyzeResponseForActions(aiResponse.response!, message, context);

      return {
        success: true,
        response: aiResponse.response!,
        actions,
        metadata: {
          patientContext,
          actionsPerformed: actions.length
        }
      };

    } catch (error) {
      console.error('Healthcare Agent Error:', error);
      return {
        success: false,
        response: 'I\'m experiencing technical difficulties. Please contact clinic staff for assistance.',
        metadata: { error: (error as Error).message }
      };
    }
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
   * Build specialized healthcare system prompt
   */
  private buildHealthcarePrompt(context: HealthcareAgentContext, patientContext: any): string {
    let prompt = `You are an advanced healthcare AI assistant for Clinic.AI, specializing in patient care coordination.

Your capabilities:
1. PATIENT SCREENING: Assess symptoms and determine urgency levels
2. APPOINTMENT BOOKING: Help schedule appointments with appropriate providers
3. FRONT DESK ASSISTANCE: Provide clinic information and general support

CRITICAL GUIDELINES:
- For EMERGENCIES (chest pain, difficulty breathing, severe bleeding): Immediately advise calling 911
- For URGENT issues (high fever, severe pain, confusion): Recommend immediate care
- Never diagnose conditions - only assess urgency and recommend professional evaluation
- Always respect patient privacy and HIPAA guidelines
- Be empathetic, professional, and clear in communication

AVAILABLE ACTIONS:
- Assess symptom severity and provide triage recommendations
- Help find available appointment times
- Provide information about clinic services and providers
- Guide patients through the check-in process
- Answer questions about insurance, billing, and policies

`;

    if (patientContext) {
      prompt += `\nPATIENT CONTEXT:
- Patient: ${patientContext.patientName}
- You have access to their medical records for appointment scheduling and care coordination
- Always verify patient identity before discussing sensitive information
`;
    }

    prompt += `\nRESPONSE STYLE:
- Keep responses clear and actionable (2-4 sentences)
- Use simple language, avoid medical jargon unless explaining
- Always end with specific next steps or questions to gather more information
- If unsure, suggest speaking with a healthcare provider

Remember: You are here to help coordinate care, not provide medical treatment.`;

    return prompt;
  }

  /**
   * Refined healthcare prompt (v2) with explicit tool/action guidance and safety rules.
   */
  private buildHealthcarePromptV2(context: HealthcareAgentContext, patientContext: any): string {
    let prompt = `You are Clinic.AI clinical coordination assistant. Your job is to safely and efficiently help patients and clinic staff coordinate care - you are not a diagnostic tool.

Core responsibilities:
- Patient screening: collect symptoms, assess urgency, and recommend safe next steps (self-care, primary care, urgent care, or emergency services).
- Appointment support: identify appropriate specialties and available practitioners and assist with scheduling (produce structured booking actions when requested).
- Administrative support: answer clinic logistics, check-in, and basic insurance questions.

Safety and behavior:
- If the user reports life-threatening symptoms (chest pain, severe difficulty breathing, unconsciousness, severe bleeding), IMMEDIATELY instruct them to call emergency services (for example, 911) and go to the nearest emergency room. Do not attempt remote triage for emergencies.
- Never provide diagnoses or definitive medical advice - only triage guidance and recommend clinician evaluation.
- Always preserve patient privacy and HIPAA. Ask identity-verification questions before discussing protected health information.

Integration and tools (available programmatically):
- getPatient(patientId) - read Patient resource from FHIR
- searchPractitioners(specialty?, name?, location?) - search Practitioner + PractitionerRole
- bookAppointment(bookingData) - create Appointment in FHIR (call only after explicit user confirmation)
- createObservation(patientId, text) - record symptom observation
- createServiceRequest(...), createEncounter(...), createComposition(...) - create orders/encounters/notes

Response guidance:
- Start with a very short empathetic summary (1 to 2 sentences).
- Provide clear next steps or an explicit question to collect missing info.
- When you want the system to perform a backend action, append a single-line JSON action object after your reply with the form:
  {"name":"<tool_name>","params":{...}}
  Example: {"name":"bookAppointment","params":{"patientId":"123","specialty":"cardiology","urgency":"routine"}}
- If multiple options exist, present them and recommend one, and request confirmation before executing actions that modify records or create orders.

If patient context is available, personalize recommendations and prefer the patient's known providers when appropriate.`;

    if (patientContext) {
      prompt += `\nPATIENT CONTEXT:\n- Patient: ${patientContext.patientName}\n- You may use available medical records for coordination tasks, but always verify identity before revealing PHI.`;
    }

    prompt += `\n\nRESPONSE STYLE:\n- Keep responses concise and empathetic (1-3 sentences), then provide explicit next steps or questions.\n- Use plain language; explain medical terms only when necessary.\n- When suggesting appointments or orders, ask for user confirmation before calling backend tools.`;

    return prompt;
  }

  /**
   * Analyze AI response for healthcare-specific actions
   */
  private async analyzeResponseForActions(
    response: string,
    originalMessage: string,
    context: HealthcareAgentContext
  ): Promise<HealthcareAction[]> {
    const actions: HealthcareAction[] = [];

    // Check for emergency keywords
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
   * Extract appointment booking data from message
   */
  private async extractAppointmentData(message: string, context: HealthcareAgentContext): Promise<AppointmentBookingData> {
    // This would use AI to parse appointment details
    // For now, return basic structure
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
  private async performSymptomScreening(message: string): Promise<PatientScreeningData | null> {
    // Extract symptoms from message
    const symptoms = this.extractSymptoms(message);
    if (symptoms.length === 0) return null;

    // Determine severity (simplified logic)
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

    return [...new Set(symptoms)]; // Remove duplicates
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
   * Get available practitioners for appointment booking
   */
  async getAvailablePractitioners(specialty?: string, name?: string , location?: string): Promise<any[]> {
    try {
      // This would query FHIR for practitioners
      // For now, return from fhir client
      const practitioners = await this.fhirClient.searchPractitioners(
        specialty, name, location);
      return practitioners;
    } catch (error) {
      console.error('Error getting practitioners:', error);
      return [];
    }    
  }

  /**
   * Book appointment through FHIR
   */
  async bookAppointment(bookingData: AppointmentBookingData): Promise<any> {
    try {
      // This would create an appointment resource in FHIR
      // For now, return mock response
      return {
        id: 'appointment-' + Date.now(),
        status: 'booked',
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        practitioner: bookingData.practitionerId,
        patient: bookingData.patientId,
        reason: bookingData.reason
      };
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }
}