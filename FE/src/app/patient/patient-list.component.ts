import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-list',
  template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Patients</h3>
      <button type="button" routerLink="/patients/new" class="btn btn-primary">Create New Patient</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="patients?.length; else noPatients" class="card-grid">
      <div *ngFor="let p of patients" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{p.resource?.name?.[0]?.text || (p.resource?.name?.[0]?.given?.join(' ') + ' ' + p.resource?.name?.[0]?.family) || p.resource?.id}}</span>
          <span class="badge badge-neutral">ID: {{p.resource?.id}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">DOB:</span>
            <span class="info-value">{{p.resource?.birthDate || '—'}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Gender:</span>
            <span class="info-value">{{p.resource?.gender || '—'}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Full URL:</span>
            <span class="info-value" style="font-size: 12px; word-break: break-all;">{{p.fullUrl}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/patients', p.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #noPatients>
      <div class="empty-state" *ngIf="!loading">No patients found.</div>
    </ng-template>
  </div>
  `,
  styles: []
})
export class PatientListComponent implements OnInit {
  patients: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private fhir: FhirService) { }

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getPatients().subscribe({
      next: (res: any) => {
        console.log('Fetched patients:', res);
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
