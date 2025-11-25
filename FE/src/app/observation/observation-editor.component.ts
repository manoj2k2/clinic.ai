import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-observation-editor',
    template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Observation</h2>
        <h2 *ngIf="!isNew">Edit Observation</h2>
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
                <option value="preliminary">Preliminary</option>
                <option value="final">Final</option>
                <option value="amended">Amended</option>
                <option value="corrected">Corrected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="form-field">
              <label>Category</label>
              <select [(ngModel)]="categoryCode" name="categoryCode" (change)="onCategoryChange()">
                <option value="">-- Select Category --</option>
                <option *ngFor="let cat of categoryOptions" [value]="cat.code">{{cat.display}}</option>
              </select>
            </div>
          </div>

          <div class="form-field">
            <label>Code/Type</label>
            <select [(ngModel)]="codeValue" name="codeValue" (change)="onCodeChange()">
              <option value="">-- Select Type --</option>
              <option *ngFor="let c of codeOptions" [value]="c.code">{{c.display}}</option>
            </select>
          </div>

          <div class="form-field">
            <label>Subject Reference</label>
            <input type="text" [(ngModel)]="subjectRef" name="subjectRef" placeholder="Patient/123" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Value & Timing</div>
          <div class="form-row">
            <div class="form-field">
              <label>Value Type</label>
              <select [(ngModel)]="valueType" name="valueType">
                <option value="quantity">Quantity</option>
                <option value="string">String</option>
                <option value="boolean">Boolean</option>
                <option value="integer">Integer</option>
              </select>
            </div>
            <div class="form-field" *ngIf="valueType === 'quantity'">
              <label>Value</label>
              <input type="number" [(ngModel)]="valueQuantityValue" name="valueQuantityValue" step="0.01" />
            </div>
            <div class="form-field" *ngIf="valueType === 'quantity'">
              <label>Unit</label>
              <input type="text" [(ngModel)]="valueQuantityUnit" name="valueQuantityUnit" placeholder="kg, mmHg, etc." />
            </div>
            <div class="form-field" *ngIf="valueType === 'string'">
              <label>Value</label>
              <input type="text" [(ngModel)]="valueString" name="valueString" />
            </div>
            <div class="form-field" *ngIf="valueType === 'boolean'">
              <label>Value</label>
              <select [(ngModel)]="valueBoolean" name="valueBoolean">
                <option [value]="true">True</option>
                <option [value]="false">False</option>
              </select>
            </div>
            <div class="form-field" *ngIf="valueType === 'integer'">
              <label>Value</label>
              <input type="number" [(ngModel)]="valueInteger" name="valueInteger" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Effective Date/Time</label>
              <input type="datetime-local" [(ngModel)]="effectiveDateTime" name="effectiveDateTime" />
            </div>
            <div class="form-field">
              <label>Issued</label>
              <input type="datetime-local" [(ngModel)]="issued" name="issued" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Additional Details</div>
          <div class="form-row">
            <div class="form-field">
              <label>Performer Reference</label>
              <input type="text" [(ngModel)]="performerRef" name="performerRef" placeholder="Practitioner/123 or Organization/456" />
            </div>
            <div class="form-field">
              <label>Interpretation</label>
              <select [(ngModel)]="interpretationCode" name="interpretationCode" (change)="onInterpretationChange()">
                <option value="">-- Select --</option>
                <option *ngFor="let i of interpretationOptions" [value]="i.code">{{i.display}}</option>
              </select>
            </div>
          </div>

          <div class="form-field">
            <label>Method</label>
            <input type="text" [(ngModel)]="methodText" name="methodText" placeholder="How the observation was performed" />
          </div>

          <div class="form-field">
            <label>Body Site</label>
            <input type="text" [(ngModel)]="bodySiteText" name="bodySiteText" placeholder="e.g., Left arm" />
          </div>

          <div class="form-field">
            <label>Notes</label>
            <textarea [(ngModel)]="note" name="note" rows="3" placeholder="Additional comments..."></textarea>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Reference Range (Optional)</div>
          <div class="form-row">
            <div class="form-field">
              <label>Low Value</label>
              <input type="number" [(ngModel)]="refRangeLow" name="refRangeLow" step="0.01" />
            </div>
            <div class="form-field">
              <label>High Value</label>
              <input type="number" [(ngModel)]="refRangeHigh" name="refRangeHigh" step="0.01" />
            </div>
            <div class="form-field">
              <label>Unit</label>
              <input type="text" [(ngModel)]="refRangeUnit" name="refRangeUnit" placeholder="Same as value unit" />
            </div>
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
export class ObservationEditorComponent implements OnInit {
    isNew = true;
    id: string | null = null;
    loading = false;
    error: string | null = null;

    // Form fields
    status = 'final';
    categoryCode = '';
    categoryDisplay = '';
    codeValue = '';
    codeDisplay = '';
    subjectRef = '';

    valueType = 'quantity';
    valueQuantityValue = 0;
    valueQuantityUnit = '';
    valueString = '';
    valueBoolean = false;
    valueInteger = 0;

    effectiveDateTime = '';
    issued = '';
    performerRef = '';
    interpretationCode = '';
    interpretationDisplay = '';
    methodText = '';
    bodySiteText = '';
    note = '';

    refRangeLow = 0;
    refRangeHigh = 0;
    refRangeUnit = '';

    categoryOptions = [
        { code: 'vital-signs', display: 'Vital Signs' },
        { code: 'laboratory', display: 'Laboratory' },
        { code: 'imaging', display: 'Imaging' },
        { code: 'procedure', display: 'Procedure' },
        { code: 'survey', display: 'Survey' },
        { code: 'exam', display: 'Exam' },
        { code: 'therapy', display: 'Therapy' },
        { code: 'activity', display: 'Activity' }
    ];

    codeOptions = [
        { code: '29463-7', display: 'Body Weight' },
        { code: '8867-4', display: 'Heart Rate' },
        { code: '85354-9', display: 'Blood Pressure' },
        { code: '8310-5', display: 'Body Temperature' },
        { code: '2708-6', display: 'Oxygen Saturation' },
        { code: '9279-1', display: 'Respiratory Rate' },
        { code: '718-7', display: 'Hemoglobin' },
        { code: '2345-7', display: 'Glucose' }
    ];

    interpretationOptions = [
        { code: 'N', display: 'Normal' },
        { code: 'L', display: 'Low' },
        { code: 'H', display: 'High' },
        { code: 'A', display: 'Abnormal' },
        { code: 'AA', display: 'Critical abnormal' },
        { code: 'HH', display: 'Critical high' },
        { code: 'LL', display: 'Critical low' }
    ];

    constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.isNew = false;
            this.loading = true;
            this.fhir.getObservation(this.id).subscribe({
                next: (res: any) => {
                    const r = res;

                    this.status = r.status || 'final';
                    this.categoryCode = r.category?.[0]?.coding?.[0]?.code || '';
                    this.categoryDisplay = r.category?.[0]?.coding?.[0]?.display || '';
                    this.codeValue = r.code?.coding?.[0]?.code || '';
                    this.codeDisplay = r.code?.coding?.[0]?.display || r.code?.text || '';
                    this.subjectRef = r.subject?.reference || '';

                    // Determine value type and extract value
                    if (r.valueQuantity) {
                        this.valueType = 'quantity';
                        this.valueQuantityValue = r.valueQuantity.value || 0;
                        this.valueQuantityUnit = r.valueQuantity.unit || '';
                    } else if (r.valueString) {
                        this.valueType = 'string';
                        this.valueString = r.valueString;
                    } else if (r.valueBoolean !== undefined) {
                        this.valueType = 'boolean';
                        this.valueBoolean = r.valueBoolean;
                    } else if (r.valueInteger !== undefined) {
                        this.valueType = 'integer';
                        this.valueInteger = r.valueInteger;
                    }

                    this.effectiveDateTime = r.effectiveDateTime ? r.effectiveDateTime.slice(0, 16) : '';
                    this.issued = r.issued ? r.issued.slice(0, 16) : '';
                    this.performerRef = r.performer?.[0]?.reference || '';
                    this.interpretationCode = r.interpretation?.[0]?.coding?.[0]?.code || '';
                    this.interpretationDisplay = r.interpretation?.[0]?.coding?.[0]?.display || '';
                    this.methodText = r.method?.text || '';
                    this.bodySiteText = r.bodySite?.text || '';
                    this.note = r.note?.[0]?.text || '';

                    if (r.referenceRange && r.referenceRange.length > 0) {
                        this.refRangeLow = r.referenceRange[0].low?.value || 0;
                        this.refRangeHigh = r.referenceRange[0].high?.value || 0;
                        this.refRangeUnit = r.referenceRange[0].low?.unit || r.referenceRange[0].high?.unit || '';
                    }

                    this.loading = false;
                }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
            });
        } else {
            // Set default times to now
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.effectiveDateTime = now.toISOString().slice(0, 16);
            this.issued = now.toISOString().slice(0, 16);
        }
    }

    onCategoryChange() {
        const selected = this.categoryOptions.find(c => c.code === this.categoryCode);
        if (selected) {
            this.categoryDisplay = selected.display;
        }
    }

    onCodeChange() {
        const selected = this.codeOptions.find(c => c.code === this.codeValue);
        if (selected) {
            this.codeDisplay = selected.display;
        }
    }

    onInterpretationChange() {
        const selected = this.interpretationOptions.find(i => i.code === this.interpretationCode);
        if (selected) {
            this.interpretationDisplay = selected.display;
        }
    }

    save() {
        const observation: any = {
            resourceType: 'Observation',
            status: this.status,
            category: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: this.categoryCode,
                    display: this.categoryDisplay
                }]
            }],
            code: {
                coding: [{
                    system: 'http://loinc.org',
                    code: this.codeValue,
                    display: this.codeDisplay
                }],
                text: this.codeDisplay
            },
            subject: { reference: this.subjectRef },
            effectiveDateTime: this.effectiveDateTime ? new Date(this.effectiveDateTime).toISOString() : undefined,
            issued: this.issued ? new Date(this.issued).toISOString() : undefined,
            performer: this.performerRef ? [{ reference: this.performerRef }] : [],
            interpretation: this.interpretationCode ? [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                    code: this.interpretationCode,
                    display: this.interpretationDisplay
                }]
            }] : [],
            method: this.methodText ? { text: this.methodText } : undefined,
            bodySite: this.bodySiteText ? { text: this.bodySiteText } : undefined,
            note: this.note ? [{ text: this.note }] : []
        };

        // Add value based on type
        if (this.valueType === 'quantity') {
            observation.valueQuantity = {
                value: this.valueQuantityValue,
                unit: this.valueQuantityUnit,
                system: 'http://unitsofmeasure.org',
                code: this.valueQuantityUnit
            };
        } else if (this.valueType === 'string') {
            observation.valueString = this.valueString;
        } else if (this.valueType === 'boolean') {
            observation.valueBoolean = this.valueBoolean;
        } else if (this.valueType === 'integer') {
            observation.valueInteger = this.valueInteger;
        }

        // Add reference range if provided
        if (this.refRangeLow || this.refRangeHigh) {
            observation.referenceRange = [{
                low: this.refRangeLow ? { value: this.refRangeLow, unit: this.refRangeUnit } : undefined,
                high: this.refRangeHigh ? { value: this.refRangeHigh, unit: this.refRangeUnit } : undefined
            }];
        }

        if (this.isNew) {
            this.fhir.createObservation(observation).subscribe({ next: () => this.router.navigate(['/observations']), error: (e) => this.error = e.message || 'Create failed' });
        } else if (this.id) {
            this.fhir.updateObservation(this.id, observation).subscribe({ next: () => this.router.navigate(['/observations']), error: (e) => this.error = e.message || 'Update failed' });
        }
    }

    remove() {
        if (!this.id) return;
        if (!confirm('Delete this observation?')) return;
        this.fhir.deleteObservation(this.id).subscribe({ next: () => this.router.navigate(['/observations']), error: (e) => this.error = e.message || 'Delete failed' });
    }

    cancel() { this.router.navigate(['/observations']); }
}
