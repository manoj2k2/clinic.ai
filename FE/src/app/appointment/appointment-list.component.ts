import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-appointment-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Appointments</h3>
      <button type="button" routerLink="/appointments/new" class="btn btn-primary">Create New Appointment</button>
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

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
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
}
