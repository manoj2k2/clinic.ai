import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-invoice-editor',
    template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Invoice</h2>
        <h2 *ngIf="!isNew">Edit Invoice</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        
        <div class="form-section">
          <div class="form-section-title">Basic Information</div>
          <div class="form-row">
            <div class="form-field">
              <label>Status</label>
              <select [(ngModel)]="status" name="status">
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="balanced">Balanced</option>
                <option value="cancelled">Cancelled</option>
                <option value="entered-in-error">Entered in Error</option>
              </select>
            </div>
            <div class="form-field">
              <label>Type</label>
              <select [(ngModel)]="typeCode" name="typeCode" (change)="onTypeChange()">
                <option value="">-- Select Type --</option>
                <option *ngFor="let t of invoiceTypes" [value]="t.code">{{t.display}}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Subject Reference</label>
              <input type="text" [(ngModel)]="subjectRef" name="subjectRef" placeholder="Patient/123" />
            </div>
            <div class="form-field">
              <label>Recipient Reference</label>
              <input type="text" [(ngModel)]="recipientRef" name="recipientRef" placeholder="Patient/123 or Organization/456" />
            </div>
          </div>

          <div class="form-field">
            <label>Creation Date</label>
            <input type="datetime-local" [(ngModel)]="creation" name="creation" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Issuer & Account</div>
          <div class="form-row">
            <div class="form-field">
              <label>Issuer Reference</label>
              <input type="text" [(ngModel)]="issuerRef" name="issuerRef" placeholder="Organization/123 or Practitioner/456" />
            </div>
            <div class="form-field">
              <label>Account Reference</label>
              <input type="text" [(ngModel)]="accountRef" name="accountRef" placeholder="Account/123" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Billing Period</div>
          <div class="form-row">
            <div class="form-field">
              <label>Period Start</label>
              <input type="date" [(ngModel)]="periodStart" name="periodStart" />
            </div>
            <div class="form-field">
              <label>Period End</label>
              <input type="date" [(ngModel)]="periodEnd" name="periodEnd" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Line Items</div>
          <div *ngFor="let item of lineItems; let i = index" style="border: 1px solid var(--border-color); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>Item {{i + 1}}</strong>
              <button type="button" (click)="removeLineItem(i)" class="btn btn-sm btn-danger">Remove</button>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>Charge Item Reference</label>
                <input type="text" [(ngModel)]="item.chargeItemRef" [name]="'chargeItemRef' + i" placeholder="ChargeItem/123" />
              </div>
              <div class="form-field">
                <label>Service Date</label>
                <input type="date" [(ngModel)]="item.servicedDate" [name]="'servicedDate' + i" />
              </div>
            </div>
          </div>
          <button type="button" (click)="addLineItem()" class="btn btn-secondary">Add Line Item</button>
        </div>

        <div class="form-section">
          <div class="form-section-title">Totals</div>
          <div class="form-row">
            <div class="form-field">
              <label>Total Net Amount</label>
              <input type="number" [(ngModel)]="totalNetValue" name="totalNetValue" step="0.01" placeholder="0.00" />
            </div>
            <div class="form-field">
              <label>Total Gross Amount</label>
              <input type="number" [(ngModel)]="totalGrossValue" name="totalGrossValue" step="0.01" placeholder="0.00" />
            </div>
            <div class="form-field">
              <label>Currency</label>
              <select [(ngModel)]="currency" name="currency">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          <div class="form-field">
            <label>Payment Terms</label>
            <textarea [(ngModel)]="paymentTerms" name="paymentTerms" rows="3" placeholder="Payment terms and conditions..."></textarea>
          </div>
        </div>

        <div class="actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px">
          <button type="button" (click)="cancel()" class="btn btn-secondary">Cancel</button>
          <button *ngIf="!isNew" type="button" (click)="remove()" class="btn btn-danger">Delete</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  `,
    styles: []
})
export class InvoiceEditorComponent implements OnInit {
    isNew = true;
    id: string | null = null;
    loading = false;
    error: string | null = null;

    // Form fields
    status = 'draft';
    typeCode = '';
    typeDisplay = '';
    subjectRef = '';
    recipientRef = '';
    creation = '';
    issuerRef = '';
    accountRef = '';
    periodStart = '';
    periodEnd = '';
    totalNetValue = 0;
    totalGrossValue = 0;
    currency = 'USD';
    paymentTerms = '';

    lineItems: Array<{ chargeItemRef: string, servicedDate: string }> = [];

    invoiceTypes = [
        { code: 'invoice', display: 'Invoice' },
        { code: 'creditnote', display: 'Credit Note' },
        { code: 'debitnote', display: 'Debit Note' },
        { code: 'statement', display: 'Statement' }
    ];

    constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.isNew = false;
            this.loading = true;
            this.fhir.getInvoice(this.id).subscribe({
                next: (res: any) => {
                    const r = res;

                    this.status = r.status || 'draft';
                    this.typeCode = r.type?.coding?.[0]?.code || '';
                    this.typeDisplay = r.type?.coding?.[0]?.display || '';
                    this.subjectRef = r.subject?.reference || '';
                    this.recipientRef = r.recipient?.reference || '';
                    this.creation = r.creation ? r.creation.slice(0, 16) : '';
                    this.issuerRef = r.issuer?.reference || '';
                    this.accountRef = r.account?.reference || '';

                    if (r.periodPeriod) {
                        this.periodStart = r.periodPeriod.start || '';
                        this.periodEnd = r.periodPeriod.end || '';
                    }

                    this.totalNetValue = r.totalNet?.value || 0;
                    this.totalGrossValue = r.totalGross?.value || 0;
                    this.currency = r.totalGross?.currency || r.totalNet?.currency || 'USD';
                    this.paymentTerms = r.paymentTerms || '';

                    if (r.lineItem && r.lineItem.length > 0) {
                        this.lineItems = r.lineItem.map((item: any) => ({
                            chargeItemRef: item.chargeItemReference?.reference || '',
                            servicedDate: item.servicedDate || ''
                        }));
                    }

                    this.loading = false;
                }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
            });
        } else {
            // Set default creation time to now
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.creation = now.toISOString().slice(0, 16);
        }
    }

    onTypeChange() {
        const selected = this.invoiceTypes.find(t => t.code === this.typeCode);
        if (selected) {
            this.typeDisplay = selected.display;
        } else {
            this.typeDisplay = '';
        }
    }

    addLineItem() {
        this.lineItems.push({ chargeItemRef: '', servicedDate: '' });
    }

    removeLineItem(index: number) {
        this.lineItems.splice(index, 1);
    }

    save() {
        const invoice: any = {
            resourceType: 'Invoice',
            status: this.status,
            type: {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0004',
                    code: this.typeCode,
                    display: this.typeDisplay
                }]
            },
            subject: { reference: this.subjectRef },
            recipient: { reference: this.recipientRef },
            creation: this.creation ? new Date(this.creation).toISOString() : undefined,
            issuer: this.issuerRef ? { reference: this.issuerRef } : undefined,
            account: this.accountRef ? { reference: this.accountRef } : undefined,
            periodPeriod: (this.periodStart || this.periodEnd) ? {
                start: this.periodStart,
                end: this.periodEnd
            } : undefined,
            lineItem: this.lineItems.map((item, index) => ({
                sequence: index + 1,
                chargeItemReference: item.chargeItemRef ? { reference: item.chargeItemRef } : undefined,
                servicedDate: item.servicedDate
            })),
            totalNet: {
                value: this.totalNetValue,
                currency: this.currency
            },
            totalGross: {
                value: this.totalGrossValue,
                currency: this.currency
            },
            paymentTerms: this.paymentTerms
        };

        if (this.isNew) {
            this.fhir.createInvoice(invoice).subscribe({ next: () => this.router.navigate(['/invoices']), error: (e) => this.error = e.message || 'Create failed' });
        } else if (this.id) {
            this.fhir.updateInvoice(this.id, invoice).subscribe({ next: () => this.router.navigate(['/invoices']), error: (e) => this.error = e.message || 'Update failed' });
        }
    }

    remove() {
        if (!this.id) return;
        if (!confirm('Delete this invoice?')) return;
        this.fhir.deleteInvoice(this.id).subscribe({ next: () => this.router.navigate(['/invoices']), error: (e) => this.error = e.message || 'Delete failed' });
    }

    cancel() { this.router.navigate(['/invoices']); }
}
