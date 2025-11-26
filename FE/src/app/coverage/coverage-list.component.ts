import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-coverage-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Coverages</h3>
      <button type="button" routerLink="/coverages/new" class="btn btn-primary">
        <i class="pi pi-plus"></i>
        <span>New Coverage</span>
      </button>
    </div>

    <div *ngIf="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading coverages...</p>
    </div>
    <div *ngIf="error" class="error-msg">
      <i class="pi pi-exclamation-triangle"></i>
      {{error}}
    </div>

    <div *ngIf="coverages?.length; else none" class="card-grid">
      <div *ngFor="let cov of coverages" class="resource-card">
        <div class="card-header">
          <span class="info-value">
            <i class="pi pi-shield"></i>
            {{cov.resource?.policyHolder?.reference || 'Coverage'}}
          </span>
          <span class="badge" [ngClass]="{'badge-success': cov.resource?.status === 'active', 'badge-warning': cov.resource?.status === 'draft', 'badge-danger': cov.resource?.status === 'cancelled', 'badge-neutral': cov.resource?.status === 'unknown'}">
            {{cov.resource?.status || '—'}}
          </span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Beneficiary:</span>
            <span class="info-value">{{cov.resource?.beneficiary?.reference || '—'}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Insurer:</span>
            <span class="info-value">{{cov.resource?.insurer?.reference || '—'}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/coverages', cov.resource?.id]" class="btn btn-sm btn-outline">
            <i class="pi pi-pencil"></i>
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">
        <i class="pi pi-inbox" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <p>No coverages found.</p>
        <button type="button" routerLink="/coverages/new" class="btn btn-primary" style="margin-top: 1rem;">
          <i class="pi pi-plus"></i>
          <span>Create First Coverage</span>
        </button>
      </div>
    </ng-template>
  </div>
  `,
    styles: []
})
export class CoverageListComponent implements OnInit {
    coverages: any[] | null = null;
    loading = false;
    error: string | null = null;

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
        this.fhir.getCoverages().subscribe({
            next: (res: any) => {
                this.coverages = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed to load coverages';
                this.loading = false;
            }
        });
    }
}
