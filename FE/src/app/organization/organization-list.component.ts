import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-organization-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Organizations</h3>
      <button type="button" routerLink="/organizations/new" class="btn btn-primary">Create New Organization</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="organizations?.length; else none" class="card-grid">
      <div *ngFor="let org of organizations" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{org.resource?.name || 'Unknown Name'}}</span>
          <span class="badge badge-neutral">ID: {{org.resource?.id}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">{{org.resource?.type?.[0]?.coding?.[0]?.display || org.resource?.type?.[0]?.text || '—'}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">City:</span>
            <span class="info-value">{{org.resource?.address?.[0]?.city || '—'}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/organizations', org.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No organizations found.</div>
    </ng-template>
  </div>
  `,
    styles: []
})
export class OrganizationListComponent implements OnInit {
    organizations: any[] | null = null;
    loading = false;
    error: string | null = null;

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
        this.fhir.getOrganizations().subscribe({
            next: (res: any) => {
                this.organizations = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }
}
