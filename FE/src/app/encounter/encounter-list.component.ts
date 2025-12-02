import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-encounter-list',
  template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Encounters</h3>
      <button type="button" routerLink="/encounters/new" class="btn btn-primary">Create New Encounter</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="encounters?.length; else none" class="card-grid">
      <div *ngFor="let enc of encounters" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{enc.resource?.type?.[0]?.text || enc.resource?.type?.[0]?.coding?.[0]?.display || 'Encounter #' + enc.resource?.id}}</span>
          <span class="badge" [ngClass]="{
            'badge-success': enc.resource?.status === 'completed',
            'badge-warning': enc.resource?.status === 'in-progress' || enc.resource?.status === 'planned',
            'badge-neutral': enc.resource?.status === 'arrived' || enc.resource?.status === 'triaged',
            'badge-danger': enc.resource?.status === 'cancelled' || enc.resource?.status === 'entered-in-error'
          }">{{enc.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">{{enc.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="enc.resource?.period?.start">
            <span class="info-label">Start:</span>
            <span class="info-value">{{enc.resource?.period?.start | date:'short'}}</span>
          </div>
          <div class="info-row" *ngIf="enc.resource?.class?.[0]">
            <span class="info-label">Class:</span>
            <span class="info-value">{{enc.resource?.class?.[0]?.coding?.[0]?.display || enc.resource?.class?.[0]?.coding?.[0]?.code}}</span>
          </div>
          <div class="info-row" *ngIf="enc.resource?.reason?.[0]">
            <span class="info-label">Reason:</span>
            <span class="info-value">{{enc.resource?.reason?.[0]?.value?.[0]?.concept?.text || enc.resource?.reason?.[0]?.value?.[0]?.concept?.coding?.[0]?.display || '—'}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/encounters', enc.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No encounters found.</div>
    </ng-template>
  </div>
  `,
  styles: []
})
export class EncounterListComponent implements OnInit {
  encounters: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private fhir: FhirService) { }

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getEncounters().subscribe({
      next: (res: any) => {
        this.encounters = res.entry || [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e.message || 'Failed';
        this.loading = false;
      }
    });
  }
}
