import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-portal',
  templateUrl: './patient-portal.component.html',
  styleUrls: ['./patient-portal.component.css']
})
export class PatientPortalComponent implements OnInit {
  patient: any = null;
  appointments: any[] = [];
  results: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private fhir: FhirService,
    public auth: AuthService
  ) { }

  ngOnInit() {
    this.loadPatientData();
  }

  loadPatientData() {
    this.loading = true;

    // 1. Try to identify the patient. 
    // In a real app, we'd use the logged-in user's ID or email to find the FHIR Patient.
    // For this demo, we'll fetch all patients and pick the first one to simulate "My Profile".
    this.fhir.getPatients().subscribe({
      next: (res: any) => {
        const patients = res.entry || [];
        if (patients.length > 0) {
          // Simulate "Current User" is the first patient found
          this.patient = patients[0].resource;
          this.fetchMyRecords(this.patient.id);
        } else {
          this.error = 'No patient profile found. Please contact the clinic.';
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = 'Failed to load profile. System may be offline.';
        this.loading = false;
      }
    });
  }

  fetchMyRecords(patientId: string) {
    // Fetch Appointments
    this.fhir.getAppointmentsForPatient(patientId).subscribe(res => {
      this.appointments = (res.entry || [])
        .map((e: any) => e.resource)
        .filter((a: any) => a.status !== 'cancelled')
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });

    // Fetch Results (DiagnosticReports)
    this.fhir.getDiagnosticReportsForPatient(patientId).subscribe(res => {
      this.results = (res.entry || []).map((e: any) => e.resource);
      this.loading = false;
    });
  }
}
