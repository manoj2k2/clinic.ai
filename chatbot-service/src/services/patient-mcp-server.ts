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
            description: 'Find available healthcare practitioners by specialty, location, and other criteria.',
            inputSchema: {
              type: 'object',
              properties: {
                specialty: {
                  type: 'string',
                  description: 'Medical specialty to search for (e.g., primary care, cardiology, dermatology)'
                },
                location: {
                  type: 'string',
                  description: 'Geographic location preference (city, neighborhood, or facility name)'
                },
                city: {
                  type: 'string',
                  description: 'Specific city to search in'
                },
                zipCode: {
                  type: 'string',
                  description: 'ZIP code for location-based search'
                },
                distance: {
                  type: 'number',
                  description: 'Maximum distance in miles from specified location'
                },
                availability: {
                  type: 'string',
                  enum: ['today', 'this-week', 'next-week', 'anytime'],
                  description: 'Timeframe for availability'
                },
                insurance: {
                  type: 'string',
                  description: 'Insurance provider accepted (e.g., Blue Cross, Aetna, Medicare)'
                },
                languages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Languages spoken by practitioner'
                },
                gender: {
                  type: 'string',
                  enum: ['male', 'female', 'any'],
                  description: 'Preferred practitioner gender'
                },
                minRating: {
                  type: 'number',
                  minimum: 1,
                  maximum: 5,
                  description: 'Minimum patient rating (1-5 stars)'
                },
                sortBy: {
                  type: 'string',
                  enum: ['distance', 'rating', 'availability', 'name'],
                  description: 'Sort results by this criteria'
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
          },
          {
            name: 'fhir_patient_observations',
            description: 'Retrieve patient observations (vital signs, lab results, symptoms) with HIPAA-compliant access.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID to retrieve observations for'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization verification'
                },
                category: {
                  type: 'string',
                  description: 'Observation category filter (e.g., vital-signs, laboratory, survey)'
                },
                code: {
                  type: 'string',
                  description: 'Observation code filter'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of observations to return',
                  default: 50
                }
              },
              required: ['patientId', 'userId']
            }
          },
          {
            name: 'create_patient_observation',
            description: 'Create a new patient observation (vital signs, lab results, symptoms) in FHIR.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID for the observation'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization and audit trail'
                },
                observation: {
                  type: 'object',
                  description: 'Complete FHIR Observation resource'
                }
              },
              required: ['patientId', 'userId', 'observation']
            }
          },
          {
            name: 'record_patient_symptoms',
            description: 'Record patient-reported symptoms as a structured FHIR observation.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID for symptom recording'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization and audit trail'
                },
                symptomText: {
                  type: 'string',
                  description: 'Description of the symptom(s)'
                },
                severity: {
                  type: 'string',
                  enum: ['mild', 'moderate', 'severe'],
                  description: 'Severity level of the symptom'
                },
                note: {
                  type: 'string',
                  description: 'Additional clinical notes'
                }
              },
              required: ['patientId', 'userId', 'symptomText']
            }
          },
          {
            name: 'record_vital_signs',
            description: 'Record patient vital signs (temperature, blood pressure, heart rate, etc.) as FHIR observations.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: {
                  type: 'string',
                  description: 'Patient ID for vital signs recording'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for authorization and audit trail'
                },
                vitalSignType: {
                  type: 'string',
                  description: 'Type of vital sign (temperature, blood-pressure, heart-rate, etc.)'
                },
                displayName: {
                  type: 'string',
                  description: 'Human-readable name for the vital sign'
                },
                value: {
                  type: 'number',
                  description: 'Measured value'
                },
                unit: {
                  type: 'string',
                  description: 'Unit of measurement (e.g., C, mmHg, bpm)'
                },
                unitCode: {
                  type: 'string',
                  description: 'UCUM unit code'
                }
              },
              required: ['patientId', 'userId', 'vitalSignType', 'displayName', 'value', 'unit']
            }
          },
          {
            name: 'fhir_health_check',
            description: 'Check the health status and connectivity of the FHIR server.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'fhir_capabilities',
            description: 'Retrieve FHIR server capabilities and supported operations.',
            inputSchema: {
              type: 'object',
              properties: {}
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
          case 'fhir_patient_observations':
            return await this.handlePatientObservations(args);
          case 'create_patient_observation':
            return await this.handleCreateObservation(args);
          case 'record_patient_symptoms':
            return await this.handleRecordSymptoms(args);
          case 'record_vital_signs':
            return await this.handleRecordVitalSigns(args);
          case 'fhir_health_check':
            return await this.handleHealthCheck(args);
          case 'fhir_capabilities':
            return await this.handleCapabilities(args);
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
   * Practitioner search with advanced filtering
   */
  private async handlePractitionerSearch(args: any) {
    const {
      specialty,
      location,
      city,
      zipCode,
      distance,
      availability,
      insurance,
      languages,
      gender,
      minRating,
      sortBy = 'distance'
    } = args;

    let practitioners = await this.findPractitionersBySpecialty(specialty, location);

    // Apply filters
    if (city) {
      practitioners = practitioners.filter(p =>
        p.city?.toLowerCase().includes(city.toLowerCase()) ||
        p.location?.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (zipCode) {
      practitioners = practitioners.filter(p =>
        p.zipCode === zipCode ||
        p.location?.includes(zipCode)
      );
    }

    if (distance && location) {
      // In a real implementation, this would calculate actual distances
      practitioners = practitioners.filter(p => p.distance <= distance);
    }

    if (availability && availability !== 'anytime') {
      practitioners = practitioners.filter(p => {
        switch (availability) {
          case 'today':
            return p.availableToday === true;
          case 'this-week':
            return p.availableThisWeek === true;
          case 'next-week':
            return p.availableNextWeek === true;
          default:
            return p.available;
        }
      });
    }

    if (insurance) {
      practitioners = practitioners.filter(p =>
        p.acceptedInsurance?.some((ins: string) =>
          ins.toLowerCase().includes(insurance.toLowerCase())
        )
      );
    }

    if (languages && languages.length > 0) {
      practitioners = practitioners.filter(p =>
        languages.some((lang: string) =>
          p.languages?.includes(lang)
        )
      );
    }

    if (gender && gender !== 'any') {
      practitioners = practitioners.filter(p => p.gender === gender);
    }

    if (minRating) {
      practitioners = practitioners.filter(p => (p.rating || 0) >= minRating);
    }

    // Sort results
    practitioners.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'availability':
          return (b.available ? 1 : 0) - (a.available ? 1 : 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    // Add search metadata
    const result = {
      searchCriteria: {
        specialty,
        location,
        city,
        zipCode,
        distance,
        availability,
        insurance,
        languages,
        gender,
        minRating,
        sortBy
      },
      totalResults: practitioners.length,
      practitioners: practitioners.map(p => ({
        id: p.id,
        name: p.name,
        specialty: p.specialty,
        location: p.location,
        city: p.city,
        zipCode: p.zipCode,
        distance: p.distance,
        phone: p.phone,
        email: p.email,
        available: p.available,
        availableToday: p.availableToday,
        availableThisWeek: p.availableThisWeek,
        availableNextWeek: p.availableNextWeek,
        rating: p.rating,
        reviewCount: p.reviewCount,
        gender: p.gender,
        languages: p.languages,
        acceptedInsurance: p.acceptedInsurance,
        education: p.education,
        experience: p.experience,
        nextAvailable: p.nextAvailable
      }))
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
   * Handle patient observations lookup
   */
  private async handlePatientObservations(args: any) {
    const { patientId, userId, category, code, limit = 50 } = args;

    // Authorization check
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to access this patient data'
      );
    }

    const observations = await this.fhirClient.getPatientObservations(
      patientId,
      category,
      code,
      limit
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(observations.map(obs => ({
            id: obs.id,
            status: obs.status,
            category: obs.category,
            code: obs.code,
            effectiveDateTime: obs.effectiveDateTime,
            valueQuantity: obs.valueQuantity,
            valueString: obs.valueString,
            valueCodeableConcept: obs.valueCodeableConcept,
            note: obs.note
          })))
        }
      ]
    };
  }

  /**
   * Handle creating patient observations
   */
  private async handleCreateObservation(args: any) {
    const { patientId, userId, observation } = args;

    // Authorization check
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to create observations for this patient'
      );
    }

    // Ensure the observation is for the correct patient
    if (observation.subject?.reference !== `Patient/${patientId}`) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Observation subject must match the specified patient ID'
      );
    }

    const createdObservation = await this.fhirClient.createObservation(observation);

    // Log for audit trail
    console.log(`📝 Created observation ${createdObservation.id} for patient ${patientId} by user ${userId}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            observation: {
              id: createdObservation.id,
              status: createdObservation.status,
              code: createdObservation.code,
              effectiveDateTime: createdObservation.effectiveDateTime,
              valueQuantity: createdObservation.valueQuantity,
              valueString: createdObservation.valueString
            }
          })
        }
      ]
    };
  }

  /**
   * Handle recording patient symptoms
   */
  private async handleRecordSymptoms(args: any) {
    const { patientId, userId, symptomText, severity, note } = args;

    // Authorization check
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to record symptoms for this patient'
      );
    }

    const observation = await this.fhirClient.createSymptomObservation(
      patientId,
      symptomText,
      severity,
      note
    );

    // Log for audit trail
    console.log(`🤒 Recorded symptoms for patient ${patientId} by user ${userId}: ${symptomText}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            observation: {
              id: observation.id,
              symptom: symptomText,
              severity,
              recordedAt: observation.effectiveDateTime
            }
          })
        }
      ]
    };
  }

  /**
   * Handle recording vital signs
   */
  private async handleRecordVitalSigns(args: any) {
    const { patientId, userId, vitalSignType, displayName, value, unit, unitCode } = args;

    // Authorization check
    const authorizedPatients = await UserPatientMappingModel.getPatientsByUser(userId);
    if (!authorizedPatients.includes(patientId)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'User not authorized to record vital signs for this patient'
      );
    }

    // Map common vital sign types to appropriate codes
    const vitalSignCodes: { [key: string]: { code: string, display: string } } = {
      'temperature': { code: '8310-5', display: 'Body temperature' },
      'blood-pressure': { code: '85354-9', display: 'Blood pressure systolic and diastolic' },
      'heart-rate': { code: '8867-4', display: 'Heart rate' },
      'respiratory-rate': { code: '9279-1', display: 'Respiratory rate' },
      'oxygen-saturation': { code: '2708-6', display: 'Oxygen saturation' },
      'weight': { code: '29463-7', display: 'Body weight' },
      'height': { code: '8302-2', display: 'Body height' },
      'bmi': { code: '39156-5', display: 'Body mass index (BMI)' }
    };

    const codeInfo = vitalSignCodes[vitalSignType] || {
      code: vitalSignType,
      display: displayName
    };

    const observation = await this.fhirClient.createVitalSignObservation(
      patientId,
      codeInfo.code,
      codeInfo.display,
      value,
      unit,
      unitCode
    );

    // Log for audit trail
    console.log(`📊 Recorded vital sign ${vitalSignType}: ${value} ${unit} for patient ${patientId} by user ${userId}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            observation: {
              id: observation.id,
              type: vitalSignType,
              value,
              unit,
              recordedAt: observation.effectiveDateTime
            }
          })
        }
      ]
    };
  }

  /**
   * Handle FHIR server health check
   */
  private async handleHealthCheck(args: any) {
    try {
      const isHealthy = await this.fhirClient.healthCheck();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: isHealthy,
              timestamp: new Date().toISOString(),
              server: 'HAPI FHIR Server'
            })
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: false,
              error: (error as Error).message,
              timestamp: new Date().toISOString()
            })
          }
        ]
      };
    }
  }

  /**
   * Handle FHIR server capabilities
   */
  private async handleCapabilities(args: any) {
    try {
      const capabilities = await this.fhirClient.getCapabilities();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              server: capabilities.software?.name || 'HAPI FHIR Server',
              version: capabilities.software?.version,
              fhirVersion: capabilities.fhirVersion,
              rest: capabilities.rest?.[0]?.mode,
              resources: capabilities.rest?.[0]?.resource?.map((r: any) => r.type) || []
            })
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get server capabilities: ${(error as Error).message}`
      );
    }
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