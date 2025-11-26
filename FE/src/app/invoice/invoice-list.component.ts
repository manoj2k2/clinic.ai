import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-invoice-list',
    template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Invoices</h3>
      <button type="button" routerLink="/invoices/new" class="btn btn-primary">Create New Invoice</button>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="invoices?.length; else none" class="card-grid">
      <div *ngFor="let inv of invoices" class="resource-card">
        <div class="card-header">
          <span class="info-value">Invoice #{{inv.resource?.id}}</span>
          <span class="badge" [ngClass]="{
            'badge-success': inv.resource?.status === 'issued',
            'badge-warning': inv.resource?.status === 'draft',
            'badge-neutral': inv.resource?.status === 'balanced',
            'badge-danger': inv.resource?.status === 'cancelled'
          }">{{inv.resource?.status || '—'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">{{inv.resource?.subject?.reference || '—'}}</span>
          </div>
          <div class="info-row" *ngIf="inv.resource?.totalGross">
            <span class="info-label">Total:</span>
            <span class="info-value">{{inv.resource?.totalGross?.value}} {{inv.resource?.totalGross?.currency}}</span>
          </div>
          <div class="info-row" *ngIf="inv.resource?.creation">
            <span class="info-label">Created:</span>
            <span class="info-value">{{inv.resource?.creation | date}}</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" [routerLink]="['/invoices', inv.resource?.id]" class="btn btn-sm btn-outline">Edit</button>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No invoices found.</div>
    </ng-template>
  </div>
  `,
    styles: [`
    .badge-danger { background-color: #fed7d7; color: #742a2a; }
  `]
})
export class InvoiceListComponent implements OnInit {
    invoices: any[] | null = null;
    loading = false;
    error: string | null = null;

    constructor(private fhir: FhirService) { }

    ngOnInit(): void {
        this.loading = true;
        this.fhir.getInvoices().subscribe({
            next: (res: any) => {
                this.invoices = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }
}
