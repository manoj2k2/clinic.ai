import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-list',
  template: `
  <div class="patient-container">
    <div style="display:flex; align-items:center; gap:12px;">
      <h3 style="margin:0">Patients / Appointments</h3>
      <div style="margin-left:auto">
        <a routerLink="/patients/new"><button>Create New Patient</button></a>
      </div>
    </div>
    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error">{{error}}</div>

    <div *ngIf="patients?.length; else noPatients" class="patient-list">
      <div *ngFor="let p of patients" class="patient-card">
        <div class="patient-row">
          <div class="patient-name">{{p.resource?.name?.[0]?.text || (p.resource?.name?.[0]?.given?.join(' ') + ' ' + p.resource?.name?.[0]?.family) || p.resource?.id}}</div>
          <div style="display:flex; gap:8px; align-items:center">
            <a [routerLink]="['/patients', p.resource?.id]"><button>Edit</button></a>
            <div class="patient-id">ID: {{p.resource?.id}}</div>
          </div>
        </div>
        <div class="patient-meta">
          <span>DOB: {{p.resource?.birthDate || '—'}}</span>
          <span>Gender: {{p.resource?.gender || '—'}}</span>
        </div>
        <div class="patient-url">fullUrl: {{p.fullUrl}}</div>
      </div>
    </div>

    <ng-template #noPatients>
      <div class="no-patients">No patients found.</div>
    </ng-template>
  </div>
  `
  ,
  styles: [
    `
    .patient-container { font-family: Arial, Helvetica, sans-serif; padding: 12px; }
    .loading { color: #666; margin-bottom: 8px; }
    .error { color: #b00020; margin-bottom: 8px; }
    .patient-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .patient-card { border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .patient-card:hover { box-shadow: 0 3px 8px rgba(0,0,0,0.06); }
    .patient-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .patient-name { font-weight: 600; color: #222; }
    .patient-id { font-size: 12px; color: #666; }
    .patient-meta { display: flex; gap: 12px; font-size: 13px; color: #444; margin-bottom: 6px; }
    .patient-url { font-size: 12px; color: #888; word-break: break-all; }
    .no-patients { color: #666; font-style: italic; }
    `
  ]
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
