import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-consent-list',
  template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Consents</h3>
      <button type="button" routerLink="/consents/new" class="btn btn-primary">Create New Consent</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="consents?.length; else none" class="card-grid">
      <div *ngFor="let c of consents" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{c.resource?.id || 'Unknown ID'}}</span>
          <span class="badge" [ngClass]="{
            'badge-success': c.resource?.status === 'active',
            'badge-warning': c.resource?.status === 'draft',
            'badge-neutral': c.resource?.status !== 'active' && c.resource?.status !== 'draft'
          }">{{c.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Patient:</span>
            <span class="info-value">{{c.resource?.patient?.reference || c.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="c.resource?.dateTime">
            <span class="info-label">Date:</span>
            <span class="info-value">{{c.resource?.dateTime | date}}</span>
          </div>
          <div class="info-row" *ngIf="c.resource?.category?.[0]?.coding?.[0]?.code">
            <span class="info-label">Category:</span>
            <span class="info-value">{{c.resource?.category?.[0]?.coding?.[0]?.code}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/consents', c.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No consents found.</div>
    </ng-template>
  </div>
  `,
  styles: []
})
export class ConsentListComponent implements OnInit {
  consents: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private fhir: FhirService) { }

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getConsents().subscribe({ next: (res: any) => { this.consents = res.entry || []; this.loading = false; }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
  }
}
