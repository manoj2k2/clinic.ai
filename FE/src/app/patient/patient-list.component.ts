import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-list',
  template: `
  <div>
    <h3>Patients / Appointments</h3>
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error" style="color:red">{{error}}</div>
    <ul *ngIf="patients">
      <li *ngFor="let p of patients">{{p.resource?.name?.[0]?.text || (p.resource?.name?.[0]?.given?.join(' ') + ' ' + p.resource?.name?.[0]?.family) || p.resource?.id}}</li>
    </ul>
  </div>
  `
})
export class PatientListComponent implements OnInit {
  patients: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private fhir: FhirService) {}

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getPatients().subscribe({
      next: (res: any) => {
        this.patients = res.entry || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to fetch patients';
        this.loading = false;
      }
    });
  }
}
