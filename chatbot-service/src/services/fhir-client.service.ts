
import axios from 'axios';

// Define axios types inline since @types/axios may not be working properly
type AxiosInstance = any;
type AxiosError = any;
 
/**
 * FHIR Client Service
 * 
 * Provides methods to interact with HAPI FHIR server (R4)
 * Features:
 * - Get patient by ID
 * - Get patient appointments
 * - Get patient observations
 * - Create observations
 * - Comprehensive error handling
 */

// =====================================================
// FHIR Resource Interfaces (R4)
// =====================================================

export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  meta?: any;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id?: string;
  meta?: any;
  status: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow' | 'entered-in-error' | 'checked-in' | 'waitlist';
  start?: string;
  end?: string;
  description?: string;
  participant: Array<{
    actor?: {
      reference?: string;
      display?: string;
    };
    status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  }>;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  meta?: any;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  code: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  valueQuantity?: {
    value: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueCodeableConcept?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  note?: Array<{
    text: string;
  }>;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{
    resource: any;
    fullUrl?: string;
  }>;
  link?: Array<{
    relation: string;
    url: string;
  }>;
}

export interface FhirOperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    diagnostics?: string;
    details?: {
      text?: string;
    };
  }>;
}

// =====================================================
// Custom Error Classes
// =====================================================

export class FhirError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public operationOutcome?: FhirOperationOutcome
  ) {
    super(message);
    this.name = 'FhirError';
  }
}

export class FhirResourceNotFoundError extends FhirError {
  constructor(resourceType: string, id: string) {
    super(`${resourceType} with ID ${id} not found`, 404);
    this.name = 'FhirResourceNotFoundError';
  }
}

export class FhirValidationError extends FhirError {
  constructor(message: string, operationOutcome?: FhirOperationOutcome) {
    super(message, 400, operationOutcome);
    this.name = 'FhirValidationError';
  }
}

export class FhirNetworkError extends FhirError {
  constructor(message: string) {
    super(message, 0);
    this.name = 'FhirNetworkError';
  }
}

// =====================================================
// FHIR Client Service
// =====================================================

export class FhirClientService {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.FHIR_BASE_URL || 'http://localhost:8082/fhir';
    this.timeout = parseInt(process.env.FHIR_TIMEOUT_MS || '10000');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => this.handleError(error)
    );

    console.log(`🔗 FHIR Client initialized: ${this.baseUrl}`);
  }

  // =====================================================
  // Error Handling
  // =====================================================

  private handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const data = error.response.data as any;

      // Check if response is an OperationOutcome
      if (data?.resourceType === 'OperationOutcome') {
        const outcome = data as FhirOperationOutcome;
        const message = outcome.issue[0]?.diagnostics || 
                       outcome.issue[0]?.details?.text || 
                       'FHIR operation failed';

        if (status === 404) {
          throw new FhirResourceNotFoundError('Resource', 'unknown');
        } else if (status === 400 || status === 422) {
          throw new FhirValidationError(message, outcome);
        } else {
          throw new FhirError(message, status, outcome);
        }
      }

      // Generic error response
      throw new FhirError(
        `FHIR API error: ${error.message}`,
        status
      );
    } else if (error.request) {
      // Request made but no response
      throw new FhirNetworkError(
        `Cannot reach FHIR server at ${this.baseUrl}. Please check if the server is running.`
      );
    } else {
      // Something else happened
      throw new FhirError(`FHIR request failed: ${error.message}`);
    }
  }

  // =====================================================
  // Patient Operations
  // =====================================================

  /**
   * Get patient by ID
   * @param patientId - FHIR Patient resource ID
   * @returns Patient resource
   */
  async getPatient(patientId: string): Promise<FhirPatient> {
    try {
      console.log(`🔍 Fetching patient: ${patientId}`);
      const response = await this.client.get(`/Patient/${patientId}`);
      
      if (!response.data.id) {
        throw new FhirResourceNotFoundError('Patient', patientId);
      }

      console.log(`✅ Found patient: ${this.getPatientName(response.data)}`);
      return response.data;
    } catch (error) {
      if (error instanceof FhirError) throw error;
      throw new FhirError(`Failed to get patient: ${(error as Error).message}`);
    }
  }

  /**
   * Get patient's name (helper)
   */
  private getPatientName(patient: FhirPatient): string {
    if (!patient.name || patient.name.length === 0) {
      return 'Unknown';
    }
    const name = patient.name[0];
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim() || 'Unknown';
  }

  // =====================================================
  // Appointment Operations
  // =====================================================

  /**
   * Get patient appointments
   * @param patientId - FHIR Patient resource ID
   * @param status - Optional status filter (e.g., 'booked', 'pending')
   * @param count - Max number of results (default: 50)
   * @returns Bundle of Appointment resources
   */
  async getPatientAppointments(
    patientId: string,
    status?: string,
    count: number = 50
  ): Promise<FhirAppointment[]> {
    try {
      console.log(`📅 Fetching appointments for patient: ${patientId}`);
      
      const params: any = {
        actor: `Patient/${patientId}`,
        _count: count,
        _sort: '-date', // Most recent first
      };

      if (status) {
        params.status = status;
      }

      const response = await this.client.get('/Appointment', { params });

      if (!response.data.entry || response.data.entry.length === 0) {
        console.log(`ℹ️  No appointments found for patient ${patientId}`);
        return [];
      }

      const appointments = response.data.entry.map((e: any) => e.resource as FhirAppointment);
      console.log(`✅ Found ${appointments.length} appointment(s)`);
      
      return appointments;
    } catch (error) {
      if (error instanceof FhirError) throw error;
      throw new FhirError(`Failed to get appointments: ${(error as Error).message}`);
    }
  }

  // =====================================================
  // Observation Operations
  // =====================================================

  /**
   * Get patient observations
   * @param patientId - FHIR Patient resource ID
   * @param category - Optional category filter (e.g., 'vital-signs', 'laboratory')
   * @param code - Optional LOINC/SNOMED code filter
   * @param count - Max number of results (default: 100)
   * @returns Array of Observation resources
   */
  async getPatientObservations(
    patientId: string,
    category?: string,
    code?: string,
    count: number = 100
  ): Promise<FhirObservation[]> {
    try {
      console.log(`🔬 Fetching observations for patient: ${patientId}`);
      
      const params: any = {
        subject: `Patient/${patientId}`,
        _count: count,
        _sort: '-date', // Most recent first
      };

      if (category) {
        params.category = category;
      }

      if (code) {
        params.code = code;
      }

      const response = await this.client.get('/Observation', { params });

      if (!response.data.entry || response.data.entry.length === 0) {
        console.log(`ℹ️  No observations found for patient ${patientId}`);
        return [];
      }

      const observations = response.data.entry.map((e: any) => e.resource as FhirObservation);
      console.log(`✅ Found ${observations.length} observation(s)`);
      
      return observations;
    } catch (error) {
      if (error instanceof FhirError) throw error;
      throw new FhirError(`Failed to get observations: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new observation
   * @param observation - Observation resource to create
   * @returns Created observation with server-assigned ID
   */
  async createObservation(observation: FhirObservation): Promise<FhirObservation> {
    try {
      // Validate required fields
      if (!observation.subject?.reference) {
        throw new FhirValidationError('Observation must have a subject reference');
      }

      if (!observation.code) {
        throw new FhirValidationError('Observation must have a code');
      }

      if (!observation.status) {
        observation.status = 'final'; // Default to final
      }

      // Set timestamps if not provided
      if (!observation.effectiveDateTime) {
        observation.effectiveDateTime = new Date().toISOString();
      }

      if (!observation.issued) {
        observation.issued = new Date().toISOString();
      }

      console.log(`📝 Creating observation for ${observation.subject.reference}`);
      
      const response = await this.client.post('/Observation', observation);
      
      console.log(`✅ Created observation: ${response.data.id}`);
      return response.data;
    } catch (error) {
      if (error instanceof FhirError) throw error;
      throw new FhirError(`Failed to create observation: ${(error as Error).message}`);
    }
  }

  /**
   * Create a simple symptom observation
   * Helper method for common use case in chatbot
   */
  async createSymptomObservation(
    patientId: string,
    symptomText: string,
    severity?: 'mild' | 'moderate' | 'severe',
    note?: string
  ): Promise<FhirObservation> {
    const observation: FhirObservation = {
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'survey',
          display: 'Survey'
        }]
      }],
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '418799008',
          display: 'Symptom'
        }],
        text: symptomText
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      effectiveDateTime: new Date().toISOString(),
      issued: new Date().toISOString(),
    };

    if (severity) {
      observation.valueCodeableConcept = {
        coding: [{
          system: 'http://snomed.info/sct',
          code: severity === 'mild' ? '255604002' : 
                severity === 'moderate' ? '6736007' : '24484000',
          display: severity.charAt(0).toUpperCase() + severity.slice(1)
        }],
        text: severity
      };
    } else {
      observation.valueString = symptomText;
    }

    if (note) {
      observation.note = [{ text: note }];
    }

    return this.createObservation(observation);
  }

  /**
   * Create a vital signs observation (e.g., temperature, blood pressure)
   */
  async createVitalSignObservation(
    patientId: string,
    code: string,
    display: string,
    value: number,
    unit: string,
    unitCode?: string
  ): Promise<FhirObservation> {
    const observation: FhirObservation = {
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: code,
          display: display
        }]
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      effectiveDateTime: new Date().toISOString(),
      issued: new Date().toISOString(),
      valueQuantity: {
        value: value,
        unit: unit,
        system: 'http://unitsofmeasure.org',
        code: unitCode || unit
      }
    };

    return this.createObservation(observation);
  }

  // =====================================================
  // Health Check
  // =====================================================

  /**
   * Test FHIR server connectivity
   * @returns true if server is reachable and responding
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/metadata');
      return response.status === 200 && response.data?.resourceType === 'CapabilityStatement';
    } catch (error) {
      console.error('❌ FHIR health check failed:', error);
      return false;
    }
  }

  // =====================================================
  // Doctor MCP FHIR operations (stubs to implement)
  // These will be called by the Doctor MCP server and should
  // interact with the HAPI FHIR backend appropriately.
  // =====================================================

  async searchPatients(args: { name?: string; identifier?: string; birthDate?: string }): Promise<any> {
    // TODO: implement patient search via /Patient?_query or query parameters
    throw new Error('searchPatients not implemented');
  }

  /**
   * Search for practitioners with optional specialty, name, and location filters.
   * Returns a simplified list combining Practitioner and PractitionerRole data.
   */
  async searchPractitioners(specialty?: string, name?: string, location?: string, max: number = 50): Promise<any[]> {
    try {
      const params: any = { _count: Math.min(max, 100) };

      if (name) params.name = name;

      // Query Practitioners (filtered by name if provided)
      const resp = await this.client.get('/Practitioner', { params });
      const entries = resp.data?.entry || [];
      const practitioners: any[] = entries.map((e: any) => e.resource);

      const results: any[] = [];

      for (const p of practitioners) {
        const pid = p.id;

        // Fetch PractitionerRole resources for this practitioner
        const roleResp = await this.client.get('/PractitionerRole', { params: { practitioner: `Practitioner/${pid}`, _count: 50 } });
        const roles = roleResp.data?.entry ? roleResp.data.entry.map((r: any) => r.resource) : [];

        // Apply specialty & location filters against roles
        let matchedRoles = roles;
        if (specialty) {
          const lc = specialty.toLowerCase();
          matchedRoles = matchedRoles.filter((r: any) => (r.specialty || []).some((s: any) => {
            const display = (s.coding || [])[0]?.display || '';
            const code = (s.coding || [])[0]?.code || '';
            return display.toLowerCase().includes(lc) || code.toLowerCase().includes(lc) || (s.text || '').toLowerCase().includes(lc);
          }));
        }

        if (location) {
          const lc = location.toLowerCase();
          matchedRoles = matchedRoles.filter((r: any) => (r.location || []).some((loc: any) => (loc.display || '').toLowerCase().includes(lc)));
        }

        // If a specialty was requested but no roles matched, skip this practitioner
        if (specialty && matchedRoles.length === 0) continue;

        results.push({
          id: pid,
          name: this.getPractitionerDisplayName(p),
          resource: p,
          roles: matchedRoles,
          telecom: p.telecom || []
        });
      }

      return results;
    } catch (error) {
      if (error instanceof FhirError) throw error;
      throw new FhirError(`Failed to search practitioners: ${(error as Error).message}`);
    }
  }

  private getPractitionerDisplayName(practitioner: any): string {
    if (!practitioner?.name || practitioner.name.length === 0) return 'Practitioner';
    const name = practitioner.name[0];
    const given = (name.given || []).join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim() || 'Practitioner';
  }

  async getPatientConditions(patientId: string, clinicalStatus?: string): Promise<any> {
    // TODO: implement Condition search for patient
    throw new Error('getPatientConditions not implemented');
  }

  async getPatientMedications(patientId: string, status?: string): Promise<any> {
    // TODO: implement MedicationRequest/MedicationStatement search for patient
    throw new Error('getPatientMedications not implemented');
  }

  async createServiceRequest(args: any): Promise<any> {
    // TODO: implement ServiceRequest creation (lab/imaging orders)
    throw new Error('createServiceRequest not implemented');
  }

  async createEncounter(args: any): Promise<any> {
    // TODO: implement Encounter creation
    throw new Error('createEncounter not implemented');
  }

  async createComposition(args: any): Promise<any> {
    // TODO: implement Composition creation (clinical notes)
    throw new Error('createComposition not implemented');
  }

  /**
   * Get FHIR server capabilities
   */
  async getCapabilities(): Promise<any> {
    try {
      const response = await this.client.get('/metadata');
      return response.data;
    } catch (error) {
      if (error instanceof FhirError) throw error;
      throw new FhirError(`Failed to get server capabilities: ${(error as Error).message}`);
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

export const fhirClient = new FhirClientService();
