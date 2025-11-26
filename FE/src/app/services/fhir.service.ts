import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class FhirService {
  constructor(private http: HttpClient) { }

  getPatients(): Observable<any> {
    // Proxy will forward /fhir to the HAPI server at localhost:8082
    return this.http.get('/fhir/Patient');
  }

  getAppointmentsForPatient(patientId: string): Observable<any> {
    return this.http.get(`/fhir/Appointment?patient=Patient/${patientId}`);
  }

  getPatient(id: string): Observable<any> {
    return this.http.get(`/fhir/Patient/${id}`);
  }

  createPatient(patient: any): Observable<any> {
    return this.http.post(`/fhir/Patient`, patient);
  }

  updatePatient(id: string, patient: any): Observable<any> {
    return this.http.put(`/fhir/Patient/${id}`, patient);
  }

  deletePatient(id: string): Observable<any> {
    return this.http.delete(`/fhir/Patient/${id}`);
  }


  // Practitioner CRUD
  getPractitioners(): Observable<any> {
    return this.http.get('/fhir/Practitioner');
  }

  getPractitioner(id: string): Observable<any> {
    return this.http.get(`/fhir/Practitioner/${id}`);
  }

  createPractitioner(practitioner: any): Observable<any> {
    return this.http.post(`/fhir/Practitioner`, practitioner);
  }

  updatePractitioner(id: string, practitioner: any): Observable<any> {
    return this.http.put(`/fhir/Practitioner/${id}`, practitioner);
  }

  deletePractitioner(id: string): Observable<any> {
    return this.http.delete(`/fhir/Practitioner/${id}`);
  }


  // Observation
  createObservation(observation: any): Observable<any> {
    return this.http.post(`/fhir/Observation`, observation);
  }

  getObservationsForPatient(patientId: string): Observable<any> {
    return this.http.get(`/fhir/Observation?subject=Patient/${patientId}&_sort=-date`);
  }

  // Consent CRUD
  getConsents(): Observable<any> {
    return this.http.get('/fhir/Consent');
  }

  getConsent(id: string): Observable<any> {
    return this.http.get(`/fhir/Consent/${id}`);
  }

  createConsent(consent: any): Observable<any> {
    return this.http.post(`/fhir/Consent`, consent);
  }

  updateConsent(id: string, consent: any): Observable<any> {
    return this.http.put(`/fhir/Consent/${id}`, consent);
  }

  deleteConsent(id: string): Observable<any> {
    return this.http.delete(`/fhir/Consent/${id}`);
  }

  // Organization CRUD
  getOrganizations(): Observable<any> {
    return this.http.get('/fhir/Organization');
  }

  getOrganization(id: string): Observable<any> {
    return this.http.get(`/fhir/Organization/${id}`);
  }

  createOrganization(organization: any): Observable<any> {
    return this.http.post(`/fhir/Organization`, organization);
  }

  updateOrganization(id: string, organization: any): Observable<any> {
    return this.http.put(`/fhir/Organization/${id}`, organization);
  }

  deleteOrganization(id: string): Observable<any> {
    return this.http.delete(`/fhir/Organization/${id}`);
  }

  // DiagnosticReport CRUD
  getDiagnosticReports(): Observable<any> {
    return this.http.get('/fhir/DiagnosticReport');
  }

  getDiagnosticReport(id: string): Observable<any> {
    return this.http.get(`/fhir/DiagnosticReport/${id}`);
  }

  createDiagnosticReport(report: any): Observable<any> {
    return this.http.post(`/fhir/DiagnosticReport`, report);
  }

  updateDiagnosticReport(id: string, report: any): Observable<any> {
    return this.http.put(`/fhir/DiagnosticReport/${id}`, report);
  }

  deleteDiagnosticReport(id: string): Observable<any> {
    return this.http.delete(`/fhir/DiagnosticReport/${id}`);
  }

  // Invoice CRUD
  getInvoices(): Observable<any> {
    return this.http.get('/fhir/Invoice');
  }

  getInvoice(id: string): Observable<any> {
    return this.http.get(`/fhir/Invoice/${id}`);
  }

  createInvoice(invoice: any): Observable<any> {
    return this.http.post(`/fhir/Invoice`, invoice);
  }

  updateInvoice(id: string, invoice: any): Observable<any> {
    return this.http.put(`/fhir/Invoice/${id}`, invoice);
  }

  deleteInvoice(id: string): Observable<any> {
    return this.http.delete(`/fhir/Invoice/${id}`);
  }

  // Standalone Observation CRUD (general observations, not patient-specific)
  getObservations(): Observable<any> {
    return this.http.get('/fhir/Observation');
  }

  getObservation(id: string): Observable<any> {
    return this.http.get(`/fhir/Observation/${id}`);
  }

  updateObservation(id: string, observation: any): Observable<any> {
    return this.http.put(`/fhir/Observation/${id}`, observation);
  }

  deleteObservation(id: string): Observable<any> {
    return this.http.delete(`/fhir/Observation/${id}`);
  }

  // Appointment CRUD
  getAppointments(): Observable<any> {
    return this.http.get('/fhir/Appointment');
  }

  getAppointment(id: string): Observable<any> {
    return this.http.get(`/fhir/Appointment/${id}`);
  }

  createAppointment(appointment: any): Observable<any> {
    return this.http.post(`/fhir/Appointment`, appointment);
  }

  updateAppointment(id: string, appointment: any): Observable<any> {
    return this.http.put(`/fhir/Appointment/${id}`, appointment);
  }

  deleteAppointment(id: string): Observable<any> {
    return this.http.delete(`/fhir/Appointment/${id}`);
  }

  // MedicationRequest
  getMedicationRequests(): Observable<any> {
    return this.http.get('/fhir/MedicationRequest');
  }

  getMedicationRequest(id: string): Observable<any> {
    return this.http.get(`/fhir/MedicationRequest/${id}`);
  }

  createMedicationRequest(medicationRequest: any): Observable<any> {
    return this.http.post('/fhir/MedicationRequest', medicationRequest);
  }

  updateMedicationRequest(id: string, medicationRequest: any): Observable<any> {
    return this.http.put(`/fhir/MedicationRequest/${id}`, medicationRequest);
  }

  deleteMedicationRequest(id: string): Observable<any> {
    return this.http.delete(`/fhir/MedicationRequest/${id}`);
  }

  // Coverage CRUD
  getCoverages(): Observable<any> {
    return this.http.get('/fhir/Coverage');
  }

  getCoverage(id: string): Observable<any> {
    return this.http.get(`/fhir/Coverage/${id}`);
  }

  createCoverage(coverage: any): Observable<any> {
    return this.http.post('/fhir/Coverage', coverage);
  }

  updateCoverage(id: string, coverage: any): Observable<any> {
    return this.http.put(`/fhir/Coverage/${id}`, coverage);
  }

  deleteCoverage(id: string): Observable<any> {
    return this.http.delete(`/fhir/Coverage/${id}`);
  }
}


