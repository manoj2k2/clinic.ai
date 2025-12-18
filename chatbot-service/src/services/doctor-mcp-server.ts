/**
 * Doctor MCP Server for Clinical Operations
 *
 * Provides secure, standardized access to clinical tools and data sources
 * for doctors and nurses via Model Context Protocol (MCP)
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

class DoctorMCPServer {
  private server: Server;
  private fhirClient: FhirClientService;

  constructor() {
    this.fhirClient = new FhirClientService();
    this.server = new Server(
      {
        name: 'clinic-ai-doctor-mcp',
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
   * Setup MCP tool handlers for clinical operations
   */
  private setupToolHandlers() {
    // List available FHIR-centric clinical tools for HAPI FHIR API
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fhir_patient_read',
            description: 'Read a FHIR Patient resource by ID.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' }
              },
              required: ['patientId']
            }
          },
          {
            name: 'fhir_patient_search',
            description: 'Search for FHIR Patient resources by name, identifier, or demographic criteria.',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Patient name (optional)' },
                identifier: { type: 'string', description: 'Patient identifier (optional)' },
                birthDate: { type: 'string', description: 'Birth date (optional, YYYY-MM-DD)' }
              }
            }
          },
          {
            name: 'fhir_observation_search',
            description: 'Search for FHIR Observation resources for a patient (labs, vitals, etc).',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                code: { type: 'string', description: 'Observation LOINC code (optional)' },
                category: { type: 'string', description: 'Observation category (optional, e.g. vital-signs, laboratory)' },
                max: { type: 'number', description: 'Maximum number of results (optional)' }
              },
              required: ['patientId']
            }
          },
          {
            name: 'fhir_condition_search',
            description: 'Search for FHIR Condition resources (problems/diagnoses) for a patient.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                clinicalStatus: { type: 'string', description: 'Clinical status (active, resolved, etc, optional)' }
              },
              required: ['patientId']
            }
          },
          {
            name: 'fhir_medication_request_search',
            description: 'Search for FHIR MedicationRequest resources (prescriptions) for a patient.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                status: { type: 'string', description: 'MedicationRequest status (active, completed, etc, optional)' }
              },
              required: ['patientId']
            }
          },
          {
            name: 'fhir_service_request_create',
            description: 'Create a FHIR ServiceRequest (lab/imaging order) for a patient.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                code: { type: 'string', description: 'LOINC/CPT code for the requested service' },
                display: { type: 'string', description: 'Service name/description' },
                category: { type: 'string', description: 'Service category (laboratory, imaging, etc)' },
                encounterId: { type: 'string', description: 'FHIR Encounter ID (optional)' },
                requesterId: { type: 'string', description: 'Practitioner/Provider ID (optional)' }
              },
              required: ['patientId', 'code', 'display', 'category']
            }
          },
          {
            name: 'fhir_encounter_create',
            description: 'Create a FHIR Encounter resource for a patient visit.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                type: { type: 'string', description: 'Encounter type (ambulatory, emergency, etc)' },
                reason: { type: 'string', description: 'Reason for visit (optional)' },
                location: { type: 'string', description: 'Location (optional)' },
                providerId: { type: 'string', description: 'Practitioner/Provider ID (optional)' }
              },
              required: ['patientId', 'type']
            }
          },
          {
            name: 'fhir_composition_create',
            description: 'Create a FHIR Composition (clinical note) for a patient.',
            inputSchema: {
              type: 'object',
              properties: {
                patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                encounterId: { type: 'string', description: 'FHIR Encounter ID (optional)' },
                authorId: { type: 'string', description: 'Practitioner/Provider ID (optional)' },
                title: { type: 'string', description: 'Note title' },
                text: { type: 'string', description: 'Note text/content' }
              },
              required: ['patientId', 'title', 'text']
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
          case 'fhir_patient_read':
            return await this.handleFhirPatientRead(args);
          case 'fhir_patient_search':
            return await this.handleFhirPatientSearch(args);
          case 'fhir_observation_search':
            return await this.handleFhirObservationSearch(args);
          case 'fhir_condition_search':
            return await this.handleFhirConditionSearch(args);
          case 'fhir_medication_request_search':
            return await this.handleFhirMedicationRequestSearch(args);
          case 'fhir_service_request_create':
            return await this.handleFhirServiceRequestCreate(args);
          case 'fhir_encounter_create':
            return await this.handleFhirEncounterCreate(args);
          case 'fhir_composition_create':
            return await this.handleFhirCompositionCreate(args);
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

  // --- FHIR Tool Handlers ---
  private async handleFhirPatientRead(args: any) {
    // args: { patientId }
    const { patientId } = args;
    const patient = await this.fhirClient.getPatient(patientId);
    return { content: [{ type: 'json', text: JSON.stringify(patient) }] };
  }

  private async handleFhirPatientSearch(args: any) {
    // args: { name?, identifier?, birthDate? }
    const results = await this.fhirClient.searchPatients(args);
    return { content: [{ type: 'json', text: JSON.stringify(results) }] };
  }

  private async handleFhirObservationSearch(args: any) {
    // args: { patientId, code?, category?, max? }
    const { patientId, code, category, max } = args;
    const results = await this.fhirClient.getPatientObservations(patientId, code, category, max);
    return { content: [{ type: 'json', text: JSON.stringify(results) }] };
  }

  private async handleFhirConditionSearch(args: any) {
    // args: { patientId, clinicalStatus? }
    const results = await this.fhirClient.getPatientConditions(args.patientId, args.clinicalStatus);
    return { content: [{ type: 'json', text: JSON.stringify(results) }] };
  }

  private async handleFhirMedicationRequestSearch(args: any) {
    // args: { patientId, status? }
    const results = await this.fhirClient.getPatientMedications(args.patientId, args.status);
    return { content: [{ type: 'json', text: JSON.stringify(results) }] };
  }

  private async handleFhirServiceRequestCreate(args: any) {
    // args: { patientId, code, display, category, encounterId?, requesterId? }
    const result = await this.fhirClient.createServiceRequest(args);
    return { content: [{ type: 'json', text: JSON.stringify(result) }] };
  }

  private async handleFhirEncounterCreate(args: any) {
    // args: { patientId, type, reason?, location?, providerId? }
    const result = await this.fhirClient.createEncounter(args);
    return { content: [{ type: 'json', text: JSON.stringify(result) }] };
  }

  private async handleFhirCompositionCreate(args: any) {
    // args: { patientId, encounterId?, authorId?, title, text }
    const result = await this.fhirClient.createComposition(args);
    return { content: [{ type: 'json', text: JSON.stringify(result) }] };
  }

  /**
   * Create clinical progress note
   */
  private async handleCreateClinicalNote(args: any) {
    const { patientId, providerId, encounterId, subjective, objective, assessment, plan } = args;

    console.log(`📝 Creating clinical note for patient ${patientId} by provider ${providerId}`);

    // In a real implementation, this would create a Composition or ClinicalImpression resource
    const clinicalNote = {
      resourceType: 'ClinicalImpression',
      status: 'completed',
      subject: { reference: `Patient/${patientId}` },
      assessor: { reference: `Practitioner/${providerId}` },
      encounter: encounterId ? { reference: `Encounter/${encounterId}` } : undefined,
      date: new Date().toISOString(),
      summary: assessment,
      finding: [
        {
          itemCodeableConcept: {
            text: assessment
          }
        }
      ],
      note: [
        {
          text: `Subjective: ${subjective || 'Not provided'}\nObjective: ${objective || 'Not provided'}\nAssessment: ${assessment}\nPlan: ${plan || 'Not provided'}`
        }
      ]
    };

    // Mock successful creation
    const noteId = `clinical-note-${Date.now()}`;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            noteId,
            created: new Date().toISOString(),
            summary: `Clinical note created for patient ${patientId}`
          })
        }
      ]
    };
  }

  /**
   * Order laboratory tests
   */
  private async handleOrderLabTest(args: any) {
    const { patientId, providerId, encounterId, tests } = args;

    console.log(`🧪 Ordering lab tests for patient ${patientId} by provider ${providerId}`);

    // In a real implementation, this would create ServiceRequest resources
    const orders = tests.map((test: any, index: number) => ({
      id: `lab-order-${Date.now()}-${index}`,
      test: test.display,
      code: test.code,
      priority: test.priority || 'routine',
      status: 'active',
      orderedBy: providerId,
      orderedAt: new Date().toISOString()
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            orders,
            message: `Ordered ${tests.length} lab test(s) for patient ${patientId}`
          })
        }
      ]
    };
  }

  /**
   * Order imaging studies
   */
  private async handleOrderImaging(args: any) {
    const { patientId, providerId, encounterId, modality, bodySite, priority, clinicalIndication } = args;

    console.log(`🩻 Ordering ${modality} imaging for patient ${patientId} by provider ${providerId}`);

    const imagingOrder = {
      id: `imaging-order-${Date.now()}`,
      modality,
      bodySite,
      priority: priority || 'routine',
      clinicalIndication,
      status: 'active',
      orderedBy: providerId,
      orderedAt: new Date().toISOString()
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            order: imagingOrder,
            message: `Ordered ${modality} imaging study for patient ${patientId}`
          })
        }
      ]
    };
  }

  /**
   * Prescribe medication
   */
  private async handlePrescribeMedication(args: any) {
    const { patientId, providerId, encounterId, medicationCode, medicationName, dosage, instructions, indication } = args;

    console.log(`💊 Prescribing ${medicationName} for patient ${patientId} by provider ${providerId}`);

    const prescription = {
      id: `prescription-${Date.now()}`,
      medication: {
        code: medicationCode,
        name: medicationName
      },
      dosage,
      instructions,
      indication,
      prescribedBy: providerId,
      prescribedAt: new Date().toISOString(),
      status: 'active'
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            prescription,
            message: `Prescribed ${medicationName} for patient ${patientId}`
          })
        }
      ]
    };
  }

  /**
   * Create clinical encounter
   */
  private async handleCreateEncounter(args: any) {
    const { patientId, providerId, encounterType, reason, location } = args;

    console.log(`🏥 Creating ${encounterType} encounter for patient ${patientId} by provider ${providerId}`);

    const encounter = {
      id: `encounter-${Date.now()}`,
      type: encounterType,
      status: 'in-progress',
      subject: { reference: `Patient/${patientId}` },
      participant: [{
        individual: { reference: `Practitioner/${providerId}` },
        type: [{ coding: [{ code: 'PPRF', display: 'Primary Performer' }] }]
      }],
      reason: reason ? [{ text: reason }] : undefined,
      location: location ? [{ location: { display: location } }] : undefined,
      period: {
        start: new Date().toISOString()
      },
      created: new Date().toISOString()
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            encounter,
            message: `Created ${encounterType} encounter for patient ${patientId}`
          })
        }
      ]
    };
  }

  /**
   * Get medication history
   */
  private async handleMedicationHistory(args: any) {
    const { patientId, providerId, includeInactive = false } = args;

    console.log(`💊 Getting medication history for patient ${patientId} by provider ${providerId}`);

    // Mock medication history - in real implementation would query MedicationRequest/MedicationStatement
    const medications = [
      {
        id: 'med-1',
        medication: 'Lisinopril 10mg',
        status: 'active',
        startDate: '2025-01-15',
        dosage: '1 tablet daily',
        indication: 'Hypertension'
      },
      {
        id: 'med-2',
        medication: 'Metformin 500mg',
        status: 'active',
        startDate: '2025-02-01',
        dosage: '1 tablet twice daily',
        indication: 'Type 2 Diabetes'
      }
    ];

    if (!includeInactive) {
      medications.filter(med => med.status === 'active');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            patientId,
            medications,
            totalCount: medications.length
          })
        }
      ]
    };
  }

  /**
   * Check drug interactions
   */
  private async handleDrugInteractions(args: any) {
    const { medications, patientId } = args;

    console.log(`⚠️ Checking drug interactions for ${medications.length} medications`);

    // Mock drug interaction checking
    const interactions = [];

    // Simple mock logic - in real implementation would use drug interaction database
    if (medications.includes('warfarin') && medications.includes('aspirin')) {
      interactions.push({
        severity: 'moderate',
        drugs: ['warfarin', 'aspirin'],
        description: 'Increased risk of bleeding',
        recommendation: 'Monitor INR closely'
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            medications,
            interactions,
            checkedAt: new Date().toISOString(),
            summary: interactions.length === 0 ? 'No significant interactions detected' : `${interactions.length} potential interaction(s) found`
          })
        }
      ]
    };
  }

  /**
   * Create care plan
   */
  private async handleCreateCarePlan(args: any) {
    const { patientId, providerId, title, description, goals, activities } = args;

    console.log(`📋 Creating care plan "${title}" for patient ${patientId} by provider ${providerId}`);

    const carePlan = {
      id: `care-plan-${Date.now()}`,
      title,
      description,
      patientId,
      createdBy: providerId,
      createdAt: new Date().toISOString(),
      status: 'active',
      goals: goals || [],
      activities: activities || []
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            carePlan,
            message: `Created care plan "${title}" for patient ${patientId}`
          })
        }
      ]
    };
  }

  /**
   * Get clinical alerts
   */
  private async handleClinicalAlerts(args: any) {
    const { patientId, providerId, alertTypes } = args;

    console.log(`🚨 Checking clinical alerts for patient ${patientId} by provider ${providerId}`);

    // Mock clinical alerts
    const alerts = [
      {
        type: 'preventive-care',
        severity: 'low',
        title: 'Annual Physical Due',
        description: 'Patient is due for annual physical examination',
        recommendation: 'Schedule annual physical within next 3 months',
        dueDate: '2025-12-14'
      },
      {
        type: 'chronic-condition',
        severity: 'medium',
        title: 'Diabetes Follow-up',
        description: 'HbA1c due for monitoring',
        recommendation: 'Order HbA1c lab test',
        dueDate: '2025-11-14'
      }
    ];

    // Filter by requested alert types
    let filteredAlerts = alerts;
    if (alertTypes && alertTypes.length > 0) {
      filteredAlerts = alerts.filter(alert => alertTypes.includes(alert.type));
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            patientId,
            alerts: filteredAlerts,
            totalCount: filteredAlerts.length,
            checkedAt: new Date().toISOString()
          })
        }
      ]
    };
  }

  /**
   * Helper: Calculate age from birth date
   */
  private calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Helper: Extract vital signs from observations
   */
  private extractVitals(observations: any[]): any {
    const vitals: any = {};

    observations.forEach(obs => {
      if (obs.category?.[0]?.coding?.[0]?.code === 'vital-signs') {
        const code = obs.code?.coding?.[0]?.code;
        const value = obs.valueQuantity?.value;
        const unit = obs.valueQuantity?.unit;

        if (code && value) {
          switch (code) {
            case '8480-6': // Systolic BP
              vitals.systolicBP = { value, unit, date: obs.effectiveDateTime };
              break;
            case '8462-4': // Diastolic BP
              vitals.diastolicBP = { value, unit, date: obs.effectiveDateTime };
              break;
            case '8310-5': // Body temperature
              vitals.temperature = { value, unit, date: obs.effectiveDateTime };
              break;
            case '8867-4': // Heart rate
              vitals.heartRate = { value, unit, date: obs.effectiveDateTime };
              break;
            case '9279-1': // Respiratory rate
              vitals.respiratoryRate = { value, unit, date: obs.effectiveDateTime };
              break;
          }
        }
      }
    });

    return vitals;
  }

  /**
   * Helper: Extract lab results from observations
   */
  private extractLabs(observations: any[]): any[] {
    return observations
      .filter(obs => obs.category?.[0]?.coding?.[0]?.code === 'laboratory')
      .map(obs => ({
        test: obs.code?.text || obs.code?.coding?.[0]?.display,
        value: obs.valueQuantity?.value || obs.valueString,
        unit: obs.valueQuantity?.unit,
        referenceRange: obs.referenceRange?.[0]?.text,
        date: obs.effectiveDateTime,
        status: obs.status
      }))
      .slice(0, 10); // Return most recent 10
  }

  /**
   * Start the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('👨‍⚕️ Doctor MCP Server started - Clinical operations ready');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new DoctorMCPServer();
  server.start().catch(console.error);
}

export { DoctorMCPServer };