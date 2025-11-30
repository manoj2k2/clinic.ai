import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-portal',
  templateUrl: './patient-portal.component.html',
  styleUrls: ['./patient-portal.component.css']
})
export class PatientPortalComponent implements OnInit {
  patient: any = 1;
  appointments: any[] = [];
  results: any[] = [];
  practitionerMap: { [id: string]: string } = {};
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

      // collect referenced practitioner ids and load their details
      const ids = new Set<string>();
      this.appointments.forEach(a => {
        (a.participant || []).forEach((p: any) => {
          const ref = p.actor?.reference;
          if (ref && ref.startsWith('Practitioner/')) {
            ids.add(ref.split('/')[1]);
          }
        });
      });

      if (ids.size > 0) {
        const calls = Array.from(ids).map(id => this.fhir.getPractitioner(id));
        forkJoin(calls).subscribe({ next: (prs: any[]) => {
          prs.forEach(pr => {
            const name = pr.name?.[0];
            const display = name ? (name.text || ((name.given?.[0] || '') + ' ' + (name.family || '')) ) : pr.id;
            this.practitionerMap[pr.id] = display;
          });

          // annotate appointments with practitioner display names
          this.appointments.forEach(a => {
            a.practitioners = (a.participant || []).map((p: any) => {
              const ref = p.actor?.reference;
              if (ref && ref.startsWith('Practitioner/')) {
                const id = ref.split('/')[1];
                return this.practitionerMap[id] || id;
              }
              return null;
            }).filter((x: any) => !!x);
          });
        }, error: () => {
          // ignore practitioner lookup errors; continue without names
        }});
      }
    });

    // Fetch Results (DiagnosticReports)
    this.fhir.getDiagnosticReportsForPatient(patientId).subscribe(res => {
      this.results = (res.entry || []).map((e: any) => e.resource);
      this.loading = false;
    });
  }
}
