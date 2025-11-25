import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-diagnostic-report-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Diagnostic Reports</h3>
      <button type="button" routerLink="/diagnostic-reports/new" class="btn btn-primary">Create New Report</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="reports?.length; else none" class="card-grid">
      <div *ngFor="let r of reports" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{r.resource?.code?.text || r.resource?.code?.coding?.[0]?.display || 'Unknown Report'}}</span>
          <span class="badge" [ngClass]="{
            'badge-success': r.resource?.status === 'final',
            'badge-warning': r.resource?.status === 'preliminary',
            'badge-neutral': r.resource?.status !== 'final' && r.resource?.status !== 'preliminary'
          }">{{r.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">{{r.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="r.resource?.effectiveDateTime">
            <span class="info-label">Effective Date:</span>
            <span class="info-value">{{r.resource?.effectiveDateTime | date}}</span>
          </div>
          <div class="info-row" *ngIf="r.resource?.issued">
            <span class="info-label">Issued:</span>
            <span class="info-value">{{r.resource?.issued | date}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/diagnostic-reports', r.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No diagnostic reports found.</div>
    </ng-template>
  </div>
  `,
    styles: []
})
export class DiagnosticReportListComponent implements OnInit {
    reports: any[] | null = null;
    loading = false;
    error: string | null = null;

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
        this.fhir.getDiagnosticReports().subscribe({
            next: (res: any) => {
                this.reports = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }
}
