import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-observation-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Observations</h3>
      <button type="button" routerLink="/observations/new" class="btn btn-primary">Create New Observation</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="observations?.length; else none" class="card-grid">
      <div *ngFor="let obs of observations" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{obs.resource?.code?.text || obs.resource?.code?.coding?.[0]?.display || 'Unknown Observation'}}</span>
          <span class="badge" [ngClass]="{
            'badge-success': obs.resource?.status === 'final',
            'badge-warning': obs.resource?.status === 'preliminary',
            'badge-neutral': obs.resource?.status !== 'final' && obs.resource?.status !== 'preliminary'
          }">{{obs.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">{{obs.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="obs.resource?.valueQuantity">
            <span class="info-label">Value:</span>
            <span class="info-value">{{obs.resource?.valueQuantity?.value}} {{obs.resource?.valueQuantity?.unit}}</span>
          </div>
          <div class="info-row" *ngIf="obs.resource?.effectiveDateTime">
            <span class="info-label">Effective:</span>
            <span class="info-value">{{obs.resource?.effectiveDateTime | date:'short'}}</span>
          </div>
          <div class="info-row" *ngIf="obs.resource?.category?.[0]">
            <span class="info-label">Category:</span>
            <span class="info-value">{{obs.resource?.category?.[0]?.coding?.[0]?.display || obs.resource?.category?.[0]?.text}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/observations', obs.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No observations found.</div>
    </ng-template>
  </div>
  `,
    styles: []
})
export class ObservationListComponent implements OnInit {
    observations: any[] | null = null;
    loading = false;
    error: string | null = null;

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
        this.fhir.getObservations().subscribe({
            next: (res: any) => {
                this.observations = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }
}
