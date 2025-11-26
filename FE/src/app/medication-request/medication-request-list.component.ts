import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-medication-request-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Medication Requests</h3>
      <button type="button" routerLink="/medication-requests/new" class="btn btn-primary">
        <i class="pi pi-plus"></i>
        <span>New Prescription</span>
      </button>
    </div>

    <div *ngIf="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading medication requests...</p>
    </div>
    <div *ngIf="error" class="error-msg">
      <i class="pi pi-exclamation-triangle"></i>
      {{error}}
    </div>

    <div *ngIf="medicationRequests?.length; else none" class="card-grid">
      <div *ngFor="let medReq of medicationRequests" class="resource-card">
        <div class="card-header">
          <span class="info-value">
            <i class="pi pi-prescription"></i>
            {{medReq.resource?.medication?.concept?.text || medReq.resource?.medication?.concept?.coding?.[0]?.display || 'Medication'}}
          </span>
          <span class="badge" [ngClass]="{
            'badge-success': medReq.resource?.status === 'active' || medReq.resource?.status === 'completed',
            'badge-warning': medReq.resource?.status === 'draft' || medReq.resource?.status === 'on-hold',
            'badge-danger': medReq.resource?.status === 'cancelled' || medReq.resource?.status === 'stopped' || medReq.resource?.status === 'entered-in-error',
            'badge-neutral': medReq.resource?.status === 'unknown'
          }">{{medReq.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">
              <i class="pi pi-user"></i>
              Patient:
            </span>
            <span class="info-value">{{medReq.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">
              <i class="pi pi-tag"></i>
              Intent:
            </span>
            <span class="info-value">{{medReq.resource?.intent || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="medReq.resource?.authoredOn">
            <span class="info-label">
              <i class="pi pi-calendar"></i>
              Authored:
            </span>
            <span class="info-value">{{medReq.resource?.authoredOn | date:'short'}}</span>
          </div>
          <div class="info-row" *ngIf="medReq.resource?.requester?.reference">
            <span class="info-label">
              <i class="pi pi-user-plus"></i>
              Requester:
            </span>
            <span class="info-value">{{medReq.resource?.requester?.reference}}</span>
          </div>
          <div class="info-row" *ngIf="medReq.resource?.priority">
            <span class="info-label">
              <i class="pi pi-exclamation-circle"></i>
              Priority:
            </span>
            <span class="info-value">{{medReq.resource?.priority}}</span>
          </div>
          <div class="info-row" *ngIf="medReq.resource?.dosageInstruction">
            <span class="info-label">
              <i class="pi pi-info-circle"></i>
              Dosage:
            </span>
            <span class="info-value">{{medReq.resource?.dosageInstruction?.text || 'See details'}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/medication-requests', medReq.resource?.id]" class="btn btn-sm btn-outline">
            <i class="pi pi-pencil"></i>
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">
        <i class="pi pi-inbox" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <p>No medication requests found.</p>
        <button type="button" routerLink="/medication-requests/new" class="btn btn-primary" style="margin-top: 1rem;">
          <i class="pi pi-plus"></i>
          <span>Create First Prescription</span>
        </button>
      </div>
    </ng-template>
  </div>
  `,
    styles: []
})
export class MedicationRequestListComponent implements OnInit {
    medicationRequests: any[] | null = null;
    loading = false;
    error: string | null = null;

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
        this.fhir.getMedicationRequests().subscribe({
            next: (res: any) => {
                this.medicationRequests = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed to load medication requests';
                this.loading = false;
            }
        });
    }
}
