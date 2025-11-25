import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-diagnostic-report-editor',
    template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Diagnostic Report</h2>
        <h2 *ngIf="!isNew">Edit Diagnostic Report</h2>
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
                <option value="registered">Registered</option>
                <option value="partial">Partial</option>
                <option value="preliminary">Preliminary</option>
                <option value="final">Final</option>
                <option value="amended">Amended</option>
                <option value="corrected">Corrected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="form-field">
              <label>Subject Reference</label>
              <input type="text" [(ngModel)]="subjectRef" name="subjectRef" placeholder="Patient/123" />
            </div>
          </div>

          <div class="form-field">
            <label>Code/Name</label>
            <input type="text" [(ngModel)]="codeText" name="codeText" placeholder="e.g. Complete Blood Count" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Category & Timing</div>
          <div class="form-row">
            <div class="form-field">
              <label>Category</label>
              <select [(ngModel)]="categoryCode" name="categoryCode" (change)="onCategoryChange()">
                <option value="">-- Select Category --</option>
                <option *ngFor="let cat of categoryOptions" [value]="cat.code">{{cat.display}}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Effective Date</label>
              <input type="datetime-local" [(ngModel)]="effectiveDateTime" name="effectiveDateTime" />
            </div>
          </div>

          <div class="form-field">
            <label>Issued Date</label>
            <input type="datetime-local" [(ngModel)]="issued" name="issued" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Performer & Interpreter</div>
          <div class="form-row">
            <div class="form-field">
              <label>Performer Reference</label>
              <input type="text" [(ngModel)]="performerRef" name="performerRef" placeholder="Practitioner/123 or Organization/456" />
            </div>
            <div class="form-field">
              <label>Results Interpreter Reference</label>
              <input type="text" [(ngModel)]="interpreterRef" name="interpreterRef" placeholder="Practitioner/123" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Results & Conclusion</div>
          <div class="form-field">
            <label>Result References (comma separated)</label>
            <input type="text" [(ngModel)]="resultRefs" name="resultRefs" placeholder="Observation/1, Observation/2" />
          </div>

          <div class="form-field">
            <label>Conclusion</label>
            <textarea [(ngModel)]="conclusion" name="conclusion" rows="4" placeholder="Clinical interpretation of results..."></textarea>
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
export class DiagnosticReportEditorComponent implements OnInit {
    isNew = true;
    id: string | null = null;
    loading = false;
    error: string | null = null;

    // Form fields
    status = 'final';
    subjectRef = '';
    codeText = '';
    categoryCode = '';
    categoryDisplay = '';
    effectiveDateTime = '';
    issued = '';
    performerRef = '';
    interpreterRef = '';
    resultRefs = '';
    conclusion = '';

    categoryOptions = [
        { code: 'LAB', display: 'Laboratory' },
        { code: 'RAD', display: 'Radiology' },
        { code: 'PAT', display: 'Pathology' },
        { code: 'MB', display: 'Microbiology' },
        { code: 'CH', display: 'Chemistry' },
        { code: 'HM', display: 'Hematology' },
        { code: 'CT', display: 'CAT Scan' },
        { code: 'NMR', display: 'Nuclear Magnetic Resonance' },
        { code: 'NMS', display: 'Nuclear Medicine Scan' },
        { code: 'RUS', display: 'Radiology Ultrasound' },
        { code: 'OTH', display: 'Other' }
    ];

    constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.isNew = false;
            this.loading = true;
            this.fhir.getDiagnosticReport(this.id).subscribe({
                next: (res: any) => {
                    const r = res;

                    this.status = r.status || 'final';
                    this.subjectRef = r.subject?.reference || '';
                    this.codeText = r.code?.text || r.code?.coding?.[0]?.display || '';

                    if (r.category && r.category.length > 0 && r.category[0].coding && r.category[0].coding.length > 0) {
                        this.categoryCode = r.category[0].coding[0].code || '';
                        this.categoryDisplay = r.category[0].coding[0].display || '';
                    }

                    this.effectiveDateTime = r.effectiveDateTime ? r.effectiveDateTime.slice(0, 16) : '';
                    this.issued = r.issued ? r.issued.slice(0, 16) : '';

                    this.performerRef = r.performer?.[0]?.reference || '';
                    this.interpreterRef = r.resultsInterpreter?.[0]?.reference || '';

                    if (r.result && r.result.length > 0) {
                        this.resultRefs = r.result.map((ref: any) => ref.reference).join(', ');
                    }

                    this.conclusion = r.conclusion || '';

                    this.loading = false;
                }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
            });
        } else {
            // Set default issued time to now
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.issued = now.toISOString().slice(0, 16);
        }
    }

    onCategoryChange() {
        const selected = this.categoryOptions.find(c => c.code === this.categoryCode);
        if (selected) {
            this.categoryDisplay = selected.display;
        } else {
            this.categoryDisplay = '';
        }
    }

    save() {
        const report: any = {
            resourceType: 'DiagnosticReport',
            status: this.status,
            code: {
                text: this.codeText
            },
            subject: {
                reference: this.subjectRef
            },
            category: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
                    code: this.categoryCode,
                    display: this.categoryDisplay
                }]
            }],
            effectiveDateTime: this.effectiveDateTime ? new Date(this.effectiveDateTime).toISOString() : undefined,
            issued: this.issued ? new Date(this.issued).toISOString() : undefined,
            performer: this.performerRef ? [{ reference: this.performerRef }] : [],
            resultsInterpreter: this.interpreterRef ? [{ reference: this.interpreterRef }] : [],
            result: this.resultRefs ? this.resultRefs.split(',').map(ref => ({ reference: ref.trim() })) : [],
            conclusion: this.conclusion
        };

        if (this.isNew) {
            this.fhir.createDiagnosticReport(report).subscribe({ next: () => this.router.navigate(['/diagnostic-reports']), error: (e) => this.error = e.message || 'Create failed' });
        } else if (this.id) {
            this.fhir.updateDiagnosticReport(this.id, report).subscribe({ next: () => this.router.navigate(['/diagnostic-reports']), error: (e) => this.error = e.message || 'Update failed' });
        }
    }

    remove() {
        if (!this.id) return;
        if (!confirm('Delete this diagnostic report?')) return;
        this.fhir.deleteDiagnosticReport(this.id).subscribe({ next: () => this.router.navigate(['/diagnostic-reports']), error: (e) => this.error = e.message || 'Delete failed' });
    }

    cancel() { this.router.navigate(['/diagnostic-reports']); }
}
