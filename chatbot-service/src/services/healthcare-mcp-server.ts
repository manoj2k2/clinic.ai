/**
 * MCP Server for Healthcare Agent
 *
 * Provides secure, standardized access to healthcare tools and data sources
 * via Model Context Protocol (MCP)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { FhirClientService } from './fhir-client.service';
import { UserPatientMappingModel } from '../models/user-patient-mapping.model';

class HealthcareMCPServer {
  private server: Server;
  private fhirClient: FhirClientService;

  constructor() {
    this.fhirClient = new FhirClientService();
    this.server = new Server(
      {
        name: 'clinic-ai-healthcare-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fhir_patient_lookup',
            description: 'Securely retrieve patient demographics from FHIR server. Requires patient ID and user authorization.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID to look up'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization check'
                }
              },
              required: ['patientId', 'userId']
            }
          },
          {
            name: 'fhir_appointments_lookup',
            description: 'Retrieve patient appointments with HIPAA-compliant access controls.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID to look up appointments for'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization verification'
                },
                dateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date' },
                    end: { type: 'string', format: 'date' }
                  }
                }
              },
              required: ['patientId', 'userId']
            }
          },
          {
            name: 'symptom_assessment',
            description: 'AI-powered symptom screening and triage assessment.',
            inputSchema: {
              type: 'object',
              properties: {
                symptoms: {
                  type: 'string',
                  description: 'Description of patient symptoms'
                },
                patientId: {
                  type: 'string',
                  description: 'Patient ID for context'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for audit trail'
                }
              },
              required: ['symptoms', 'userId']
            }
          },
          {
            name: 'appointment_booking',
            description: 'Schedule healthcare appointments with provider matching and availability checking.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID for appointment'
                },
                specialty: {
                  type: 'string',
                  description: 'Medical specialty needed'
                },
                urgency: {
                  type: 'string',
                  enum: ['routine', 'urgent', 'emergency']
                },
                preferredDate: {
                  type: 'string',
                  format: 'date-time'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization'
                }
              },
              required: ['patientId', 'specialty', 'userId']
            }
          },
          {
            name: 'practitioner_search',
            description: 'Find available healthcare practitioners by specialty and location.',
            inputSchema: {
              type: 'object',
              properties: {
                specialty: {
                  type: 'string',
                  description: 'Medical specialty to search for'
                },
                location: {
                  type: 'string',
                  description: 'Geographic location preference'
                },
                availability: {
                  type: 'string',
                  enum: ['today', 'this-week', 'next-week']
                }
              },
              required: ['specialty']
            }
          },
          {
            name: 'emergency_detection',
            description: 'Analyze text for medical emergencies and provide immediate response guidance.',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'Text to analyze for emergency indicators'
                },
                patientId: {
                  type: 'string',
                  description: 'Patient ID for context'
                }
              },
              required: ['text']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fhir_patient_lookup':
            return await this.handlePatientLookup(args);
          case 'fhir_appointments_lookup':
            return await this.handleAppointmentsLookup(args);
          case 'symptom_assessment':
            return await this.handleSymptomAssessment(args);
          case 'appointment_booking':
            return await this.handleAppointmentBooking(args);
          case 'practitioner_search':
            return await this.handlePractitionerSearch(args);
          case 'emergency_detection':
            return await this.handleEmergencyDetection(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Tool execution error for ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${(error as Error).message}`
        );
      }
    });
  }

  /**
   * Secure patient lookup with authorization
   */
  private async handlePatientLookup(args: any) {
    const { patientId, userId } = args;

    // Verify user has access to this patient
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to access this patient data'
      );
    }

    const patient = await this.fhirClient.getPatient(patientId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: patient.id,
            name: patient.name?.[0] ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : 'Unknown',
            gender: patient.gender,
            birthDate: patient.birthDate,
            telecom: patient.telecom,
            address: patient.address
          })
        }
      ]
    };
  }

  /**
   * Secure appointments lookup
   */
  private async handleAppointmentsLookup(args: any) {
    const { patientId, userId, dateRange } = args;

    // Authorization check
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to access this patient data'
      );
    }

    const appointments = await this.fhirClient.getPatientAppointments(patientId);

    // Filter by date range if provided
    let filteredAppointments = appointments;
    if (dateRange) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      filteredAppointments = appointments.filter(apt => {
        if (!apt.start) return false;
        const aptDate = new Date(apt.start);
        return aptDate >= startDate && aptDate <= endDate;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filteredAppointments.map(apt => ({
            id: apt.id,
            status: apt.status,
            start: apt.start,
            description: apt.description,
            participant: apt.participant
          })))
        }
      ]
    };
  }

  /**
   * AI-powered symptom assessment
   */
  private async handleSymptomAssessment(args: any) {
    const { symptoms, patientId, userId } = args;

    // Log for audit trail
    console.log(`🔍 Symptom assessment requested for patient ${patientId} by user ${userId}`);

    const assessment = this.performSymptomAnalysis(symptoms);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(assessment)
        }
      ]
    };
  }

  /**
   * Secure appointment booking
   */
  private async handleAppointmentBooking(args: any) {
    const { patientId, specialty, urgency, preferredDate, userId } = args;

    // Authorization check
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to book appointments for this patient'
      );
    }

    // Find available practitioner
    const practitioners = await this.findPractitionersBySpecialty(specialty);
    const availablePractitioner = practitioners.find(p => p.available);

    if (!availablePractitioner) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `No ${specialty} practitioners available`
            })
          }
        ]
      };
    }

    // Book appointment
    const appointment = {
      id: `apt-${Date.now()}`,
      status: 'booked',
      start: preferredDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      practitioner: availablePractitioner.id,
      patient: patientId,
      specialty,
      urgency: urgency || 'routine'
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            appointment
          })
        }
      ]
    };
  }

  /**
   * Practitioner search
   */
  private async handlePractitionerSearch(args: any) {
    const { specialty, location, availability } = args;

    const practitioners = await this.findPractitionersBySpecialty(specialty, location);

    // Filter by availability if requested
    let filteredPractitioners = practitioners;
    if (availability) {
      // In a real implementation, this would check actual schedules
      filteredPractitioners = practitioners.filter(p => p.available);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filteredPractitioners)
        }
      ]
    };
  }

  /**
   * Emergency detection
   */
  private async handleEmergencyDetection(args: any) {
    const { text, patientId } = args;

    const emergencyIndicators = [
      'chest pain', 'difficulty breathing', 'severe bleeding',
      'unconscious', 'heart attack', 'stroke', 'emergency'
    ];

    const detected = emergencyIndicators.some(indicator =>
      text.toLowerCase().includes(indicator)
    );

    const result = {
      emergency: detected,
      indicators: emergencyIndicators.filter(indicator =>
        text.toLowerCase().includes(indicator)
      ),
      action: detected ? 'CALL 911 IMMEDIATELY' : 'Monitor symptoms',
      patientId
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  }

  /**
   * Perform symptom analysis
   */
  private performSymptomAnalysis(symptoms: string) {
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

    const detectedSymptoms = symptomPatterns
      .map(pattern => symptoms.match(pattern))
      .filter(match => match !== null)
      .flat()
      .filter((symptom, index, arr) => arr.indexOf(symptom) === index);

    const severity = this.assessSeverity(detectedSymptoms, symptoms);

    return {
      symptoms: detectedSymptoms,
      severity,
      recommendations: this.generateRecommendations(severity),
      urgency: severity === 'emergency' ? 'immediate' : severity === 'severe' ? 'urgent' : 'routine'
    };
  }

  /**
   * Assess symptom severity
   */
  private assessSeverity(symptoms: string[], message: string): string {
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
   * Generate recommendations
   */
  private generateRecommendations(severity: string): string[] {
    switch (severity) {
      case 'emergency':
        return ['CALL 911 IMMEDIATELY or go to the nearest emergency room'];
      case 'severe':
        return ['Seek immediate medical attention at urgent care or ER'];
      case 'moderate':
        return ['Schedule an appointment with your primary care provider within 1-2 days'];
      case 'mild':
        return ['Schedule a routine appointment with your healthcare provider'];
      default:
        return ['Monitor your symptoms and consult a healthcare provider if they worsen'];
    }
  }

  /**
   * Find practitioners by specialty
   */
  private async findPractitionersBySpecialty(specialty: string, location?: string): Promise<any[]> {
    // In a real implementation, this would query a practitioner directory
    const mockPractitioners = [
      {
        id: 'practitioner-1',
        name: 'Dr. Sarah Johnson',
        specialty: 'primary care',
        location: 'Main Campus',
        available: true
      },
      {
        id: 'practitioner-2',
        name: 'Dr. Michael Chen',
        specialty: 'cardiology',
        location: 'Heart Center',
        available: specialty === 'cardiology'
      },
      {
        id: 'practitioner-3',
        name: 'Dr. Emily Rodriguez',
        specialty: 'dermatology',
        location: 'Medical Plaza',
        available: specialty === 'dermatology'
      }
    ];

    return mockPractitioners.filter(p =>
      p.specialty === specialty || specialty === 'general'
    );
  }

  /**
   * Start the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🏥 Healthcare MCP Server started');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new HealthcareMCPServer();
  server.start().catch(console.error);
}

export { HealthcareMCPServer };