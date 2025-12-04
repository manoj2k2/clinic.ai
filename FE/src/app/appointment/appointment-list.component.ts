import { Component, Input, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-appointment-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Appointments</h3>
      <button type="button" routerLink="/appointments/new" class="btn btn-primary">Create New Appointment</button>
    </div>
    <div class="search-bar" style="display:flex; gap:8px; align-items:center; margin:12px 0">
      <input class="input" placeholder="Patient (Patient/{id} or identifier)" [(ngModel)]="searchPatientInput" />
      <input class="input" placeholder="Practitioner (Practitioner/{id})" [(ngModel)]="searchPractitionerInput" />
      <button class="btn btn-sm btn-primary" (click)="doSearch()">Search</button>
      <button class="btn btn-sm btn-outline" (click)="clearSearch()">Clear</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="appointments?.length; else none" class="card-grid">
      <div *ngFor="let appt of appointments" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{appt.resource?.description || 'Appointment #' + appt.resource?.id}}</span>
          <span class="badge" [ngClass]="{
            'badge-success': appt.resource?.status === 'booked',
            'badge-warning': appt.resource?.status === 'pending' || appt.resource?.status === 'proposed',
            'badge-neutral': appt.resource?.status === 'arrived' || appt.resource?.status === 'checked-in',
            'badge-danger': appt.resource?.status === 'cancelled' || appt.resource?.status === 'noshow'
          }">{{appt.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">{{appt.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="appt.resource?.start">
            <span class="info-label">Start:</span>
            <span class="info-value">{{appt.resource?.start | date:'short'}}</span>
          </div>
          <div class="info-row" *ngIf="appt.resource?.minutesDuration">
            <span class="info-label">Duration:</span>
            <span class="info-value">{{appt.resource?.minutesDuration}} minutes</span>
          </div>
          <div class="info-row" *ngIf="appt.resource?.serviceType?.[0]">
            <span class="info-label">Service:</span>
            <span class="info-value">{{appt.resource?.serviceType?.[0]?.concept?.text || appt.resource?.serviceType?.[0]?.concept?.coding?.[0]?.display}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/appointments', appt.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No appointments found.</div>
    </ng-template>
  </div>
  `,
    styles: []
})
export class AppointmentListComponent implements OnInit {
    appointments: any[] | null = null;
    loading = false;
    error: string | null = null;
    @Input() patientRef: string | null = null;
    @Input() practitionerRef: string | null = null;
  // UI search inputs
  searchPatientInput: string | null = null;
  searchPractitionerInput: string | null = null;

    constructor(private fhir: FhirService) { }
    
    // implementation for searching by patient or practitioner reference can be added here in the future
    searchByPatientRef(patientRef: string): void {
        this.loading = true;
        this.fhir.searchAppointmentsByPatientRef(patientRef).subscribe({
            next: (res: any) => {
                this.appointments = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }
    searchByPractitionerRef(practitionerRef: string): void {
        this.loading = true;
        this.fhir.searchAppointmentsByPractitionerRef(practitionerRef).subscribe({
            next: (res: any) => {
                this.appointments = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }

    ngOnInit(): void {
        this.loading = true;
      // If a patient or practitioner reference was supplied as an input, use the FHIR search URL
      if (this.patientRef || this.practitionerRef) {
        const params: { [k: string]: string } = {};
        if (this.patientRef) { params['patient'] = this.patientRef; }
        if (this.practitionerRef) { params['practitioner'] = this.practitionerRef; }
        this.fhir.searchAppointments(params).subscribe({ next: (res: any) => {
          this.appointments = res.entry || [];
          this.loading = false;
        }, error: (e) => {
          this.error = e.message || 'Failed';
          this.loading = false;
        }});
        return;
      }

      this.fhir.getAppointments().subscribe({
        next: (res: any) => {
          this.appointments = res.entry || [];
          this.loading = false;
        },
        error: (e) => {
          this.error = e.message || 'Failed';
          this.loading = false;
        }
      });
    }

    doSearch(): void {
      this.loading = true;
      const params: { [k: string]: string } = {};
      if (this.searchPatientInput) { params['patient'] = this.searchPatientInput; }
      if (this.searchPractitionerInput) { params['practitioner'] = this.searchPractitionerInput; }
      if (Object.keys(params).length === 0) {
        // nothing entered, load all
        this.fhir.getAppointments().subscribe({ next: (res: any) => { this.appointments = res.entry || []; this.loading = false; }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
        return;
      }

      this.fhir.searchAppointments(params).subscribe({ next: (res: any) => {
        this.appointments = res.entry || [];
        this.loading = false;
      }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
    }

    clearSearch(): void {
      this.searchPatientInput = null;
      this.searchPractitionerInput = null;
      this.loading = true;
      this.fhir.getAppointments().subscribe({ next: (res: any) => { this.appointments = res.entry || []; this.loading = false; }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
    }
}
