import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-medication-request-editor',
    template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">
          <i class="pi pi-plus-circle"></i>
          Create Medication Request
        </h2>
        <h2 *ngIf="!isNew">
          <i class="pi pi-pencil"></i>
          Edit Medication Request
        </h2>
      </div>

      <div *ngIf="loading" class="loading">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        <p>Loading...</p>
      </div>
      <div *ngIf="error" class="error-msg">
        <i class="pi pi-exclamation-triangle"></i>
        {{error}}
      </div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        
        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-info-circle"></i>
            Basic Information
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Status *</label>
              <select [(ngModel)]="status" name="status" required>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="ended">Ended</option>
                <option value="stopped">Stopped</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="entered-in-error">Entered in Error</option>
                <option value="draft">Draft</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div class="form-field">
              <label>Intent *</label>
              <select [(ngModel)]="intent" name="intent" required>
                <option value="proposal">Proposal</option>
                <option value="plan">Plan</option>
                <option value="order">Order</option>
                <option value="original-order">Original Order</option>
                <option value="reflex-order">Reflex Order</option>
                <option value="filler-order">Filler Order</option>
                <option value="instance-order">Instance Order</option>
                <option value="option">Option</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Priority</label>
              <select [(ngModel)]="priority" name="priority">
                <option value="">-- Select Priority --</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="asap">ASAP</option>
                <option value="stat">STAT</option>
              </select>
            </div>
            <div class="form-field">
              <label>Authored On</label>
              <input type="datetime-local" [(ngModel)]="authoredOn" name="authoredOn" />
            </div>
          </div>

          <div class="form-field">
            <label>
              <input type="checkbox" [(ngModel)]="doNotPerform" name="doNotPerform" style="width: auto; margin-right: 8px;" />
              Do Not Perform (Patient should NOT take this medication)
            </label>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-prescription"></i>
            Medication Details
          </div>
          <div class="form-field">
            <label>Medication Name *</label>
            <input type="text" [(ngModel)]="medicationText" name="medicationText" placeholder="e.g., Amoxicillin 500mg" required />
          </div>

          <div class="form-field">
            <label>Medication Code (Optional)</label>
            <input type="text" [(ngModel)]="medicationCode" name="medicationCode" placeholder="e.g., RxNorm code" />
          </div>

          <div class="form-field">
            <label>Medication System (Optional)</label>
            <input type="text" [(ngModel)]="medicationSystem" name="medicationSystem" placeholder="e.g., http://www.nlm.nih.gov/research/umls/rxnorm" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-users"></i>
            Patient & Requester
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Subject (Patient) *</label>
              <input type="text" [(ngModel)]="subjectRef" name="subjectRef" placeholder="Patient/123" required />
            </div>
            <div class="form-field">
              <label>Requester</label>
              <input type="text" [(ngModel)]="requesterRef" name="requesterRef" placeholder="Practitioner/456" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Encounter</label>
              <input type="text" [(ngModel)]="encounterRef" name="encounterRef" placeholder="Encounter/789" />
            </div>
            <div class="form-field">
              <label>Recorder</label>
              <input type="text" [(ngModel)]="recorderRef" name="recorderRef" placeholder="Practitioner/101" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-info"></i>
            Dosage Instructions
          </div>
          <div class="form-field">
            <label>Dosage Text</label>
            <textarea [(ngModel)]="dosageText" name="dosageText" rows="3" placeholder="e.g., Take 1 tablet by mouth twice daily with food"></textarea>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Timing Code</label>
              <input type="text" [(ngModel)]="dosageTimingCode" name="dosageTimingCode" placeholder="e.g., BID (twice daily)" />
            </div>
            <div class="form-field">
              <label>Route</label>
              <input type="text" [(ngModel)]="dosageRoute" name="dosageRoute" placeholder="e.g., Oral" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Dose Quantity</label>
              <input type="number" [(ngModel)]="doseQuantity" name="doseQuantity" placeholder="1" step="0.1" />
            </div>
            <div class="form-field">
              <label>Dose Unit</label>
              <input type="text" [(ngModel)]="doseUnit" name="doseUnit" placeholder="tablet" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-calendar"></i>
            Effective Period
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Start Date</label>
              <input type="datetime-local" [(ngModel)]="effectiveStart" name="effectiveStart" />
            </div>
            <div class="form-field">
              <label>End Date</label>
              <input type="datetime-local" [(ngModel)]="effectiveEnd" name="effectiveEnd" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-shopping-cart"></i>
            Dispense Request
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Number of Repeats Allowed</label>
              <input type="number" [(ngModel)]="numberOfRepeats" name="numberOfRepeats" placeholder="0" min="0" />
            </div>
            <div class="form-field">
              <label>Quantity to Dispense</label>
              <input type="number" [(ngModel)]="dispenseQuantity" name="dispenseQuantity" placeholder="30" step="0.1" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Quantity Unit</label>
              <input type="text" [(ngModel)]="dispenseUnit" name="dispenseUnit" placeholder="tablet" />
            </div>
            <div class="form-field">
              <label>Expected Supply Duration (days)</label>
              <input type="number" [(ngModel)]="supplyDuration" name="supplyDuration" placeholder="30" />
            </div>
          </div>

          <div class="form-field">
            <label>Dispenser Organization</label>
            <input type="text" [(ngModel)]="dispenserRef" name="dispenserRef" placeholder="Organization/pharmacy123" />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Validity Period Start</label>
              <input type="datetime-local" [(ngModel)]="validityStart" name="validityStart" />
            </div>
            <div class="form-field">
              <label>Validity Period End</label>
              <input type="datetime-local" [(ngModel)]="validityEnd" name="validityEnd" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-sync"></i>
            Substitution
          </div>
          <div class="form-field">
            <label>
              <input type="checkbox" [(ngModel)]="substitutionAllowed" name="substitutionAllowed" style="width: auto; margin-right: 8px;" />
              Substitution Allowed
            </label>
          </div>

          <div class="form-field" *ngIf="substitutionAllowed">
            <label>Substitution Reason</label>
            <input type="text" [(ngModel)]="substitutionReason" name="substitutionReason" placeholder="e.g., formulary policy" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            <i class="pi pi-comment"></i>
            Additional Information
          </div>
          <div class="form-field">
            <label>Reason for Prescription</label>
            <input type="text" [(ngModel)]="reasonText" name="reasonText" placeholder="e.g., Bacterial infection" />
          </div>

          <div class="form-field">
            <label>Course of Therapy Type</label>
            <select [(ngModel)]="courseOfTherapy" name="courseOfTherapy">
              <option value="">-- Select --</option>
              <option value="continuous">Continuous long term therapy</option>
              <option value="acute">Short course (acute) therapy</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>

          <div class="form-field">
            <label>Notes</label>
            <textarea [(ngModel)]="note" name="note" rows="3" placeholder="Additional notes or instructions..."></textarea>
          </div>
        </div>

        <div class="actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px; flex-wrap: wrap;">
          <button type="button" (click)="cancel()" class="btn btn-secondary">
            <i class="pi pi-times"></i>
            <span>Cancel</span>
          </button>
          <button *ngIf="!isNew" type="button" (click)="remove()" class="btn btn-danger">
            <i class="pi pi-trash"></i>
            <span>Delete</span>
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="pi pi-check"></i>
            <span>Save</span>
          </button>
        </div>
      </form>
    </div>
  </div>
  `,
    styles: []
})
export class MedicationRequestEditorComponent implements OnInit {
    isNew = true;
    id: string | null = null;
    loading = false;
    error: string | null = null;

    // Basic Information
    status = 'active';
    intent = 'order';
    priority = '';
    authoredOn = '';
    doNotPerform = false;

    // Medication
    medicationText = '';
    medicationCode = '';
    medicationSystem = '';

    // Patient & Requester
    subjectRef = '';
    requesterRef = '';
    encounterRef = '';
    recorderRef = '';

    // Dosage
    dosageText = '';
    dosageTimingCode = '';
    dosageRoute = '';
    doseQuantity: number | null = null;
    doseUnit = '';

    // Effective Period
    effectiveStart = '';
    effectiveEnd = '';

    // Dispense Request
    numberOfRepeats: number | null = null;
    dispenseQuantity: number | null = null;
    dispenseUnit = '';
    supplyDuration: number | null = null;
    dispenserRef = '';
    validityStart = '';
    validityEnd = '';

    // Substitution
    substitutionAllowed = true;
    substitutionReason = '';

    // Additional
    reasonText = '';
    courseOfTherapy = '';
    note = '';

    constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.isNew = false;
            this.loading = true;
            this.fhir.getMedicationRequest(this.id).subscribe({
                next: (res: any) => {
                    const r = res;

                    this.status = r.status || 'active';
                    this.intent = r.intent || 'order';
                    this.priority = r.priority || '';
                    this.authoredOn = r.authoredOn ? r.authoredOn.slice(0, 16) : '';
                    this.doNotPerform = r.doNotPerform || false;

                    // Medication
                    this.medicationText = r.medication?.concept?.text || '';
                    this.medicationCode = r.medication?.concept?.coding?.[0]?.code || '';
                    this.medicationSystem = r.medication?.concept?.coding?.[0]?.system || '';

                    // References
                    this.subjectRef = r.subject?.reference || '';
                    this.requesterRef = r.requester?.reference || '';
                    this.encounterRef = r.encounter?.reference || '';
                    this.recorderRef = r.recorder?.reference || '';

                    // Dosage
                    if (r.dosageInstruction) {
                        this.dosageText = r.dosageInstruction.text || '';
                        this.dosageTimingCode = r.dosageInstruction.timing?.code?.text || '';
                        this.dosageRoute = r.dosageInstruction.route?.text || '';
                        this.doseQuantity = r.dosageInstruction.doseAndRate?.[0]?.doseQuantity?.value || null;
                        this.doseUnit = r.dosageInstruction.doseAndRate?.[0]?.doseQuantity?.unit || '';
                    }

                    // Effective Period
                    if (r.effectiveTimingPeriod) {
                        this.effectiveStart = r.effectiveTimingPeriod.start ? r.effectiveTimingPeriod.start.slice(0, 16) : '';
                        this.effectiveEnd = r.effectiveTimingPeriod.end ? r.effectiveTimingPeriod.end.slice(0, 16) : '';
                    }

                    // Dispense Request
                    if (r.dispenseRequest) {
                        this.numberOfRepeats = r.dispenseRequest.numberOfRepeatsAllowed || null;
                        this.dispenseQuantity = r.dispenseRequest.quantity?.value || null;
                        this.dispenseUnit = r.dispenseRequest.quantity?.unit || '';
                        this.supplyDuration = r.dispenseRequest.expectedSupplyDuration?.value || null;
                        this.dispenserRef = r.dispenseRequest.dispenser?.reference || '';
                        this.validityStart = r.dispenseRequest.validityPeriod?.start ? r.dispenseRequest.validityPeriod.start.slice(0, 16) : '';
                        this.validityEnd = r.dispenseRequest.validityPeriod?.end ? r.dispenseRequest.validityPeriod.end.slice(0, 16) : '';
                    }

                    // Substitution
                    if (r.substitution) {
                        this.substitutionAllowed = r.substitution.allowedBoolean !== false;
                        this.substitutionReason = r.substitution.reason?.text || '';
                    }

                    // Additional
                    this.reasonText = r.reason?.[0]?.concept?.text || '';
                    this.courseOfTherapy = r.courseOfTherapyType?.coding?.[0]?.code || '';
                    this.note = r.note?.[0]?.text || '';

                    this.loading = false;
                },
                error: (e) => {
                    this.error = e.message || 'Failed to load medication request';
                    this.loading = false;
                }
            });
        } else {
            // Set default authored date to now
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.authoredOn = now.toISOString().slice(0, 16);
        }
    }

    save() {
        const medicationRequest: any = {
            resourceType: 'MedicationRequest',
            status: this.status,
            intent: this.intent,
            priority: this.priority || undefined,
            doNotPerform: this.doNotPerform || undefined,
            medication: {
                concept: {
                    text: this.medicationText,
                    coding: this.medicationCode ? [{
                        system: this.medicationSystem || 'http://www.nlm.nih.gov/research/umls/rxnorm',
                        code: this.medicationCode
                    }] : undefined
                }
            },
            subject: this.subjectRef ? { reference: this.subjectRef } : undefined,
            requester: this.requesterRef ? { reference: this.requesterRef } : undefined,
            encounter: this.encounterRef ? { reference: this.encounterRef } : undefined,
            recorder: this.recorderRef ? { reference: this.recorderRef } : undefined,
            authoredOn: this.authoredOn ? new Date(this.authoredOn).toISOString() : undefined,
            dosageInstruction: this.dosageText ? {
                text: this.dosageText,
                timing: this.dosageTimingCode ? { code: { text: this.dosageTimingCode } } : undefined,
                route: this.dosageRoute ? { text: this.dosageRoute } : undefined,
                doseAndRate: (this.doseQuantity !== null) ? [{
                    doseQuantity: {
                        value: this.doseQuantity,
                        unit: this.doseUnit
                    }
                }] : undefined
            } : undefined,
            effectiveTimingPeriod: (this.effectiveStart || this.effectiveEnd) ? {
                start: this.effectiveStart ? new Date(this.effectiveStart).toISOString() : undefined,
                end: this.effectiveEnd ? new Date(this.effectiveEnd).toISOString() : undefined
            } : undefined,
            dispenseRequest: (this.numberOfRepeats !== null || this.dispenseQuantity !== null || this.dispenserRef) ? {
                numberOfRepeatsAllowed: this.numberOfRepeats || undefined,
                quantity: this.dispenseQuantity !== null ? {
                    value: this.dispenseQuantity,
                    unit: this.dispenseUnit
                } : undefined,
                expectedSupplyDuration: this.supplyDuration !== null ? {
                    value: this.supplyDuration,
                    unit: 'days'
                } : undefined,
                dispenser: this.dispenserRef ? { reference: this.dispenserRef } : undefined,
                validityPeriod: (this.validityStart || this.validityEnd) ? {
                    start: this.validityStart ? new Date(this.validityStart).toISOString() : undefined,
                    end: this.validityEnd ? new Date(this.validityEnd).toISOString() : undefined
                } : undefined
            } : undefined,
            substitution: {
                allowedBoolean: this.substitutionAllowed,
                reason: this.substitutionReason ? { text: this.substitutionReason } : undefined
            },
            reason: this.reasonText ? [{ concept: { text: this.reasonText } }] : undefined,
            courseOfTherapyType: this.courseOfTherapy ? {
                coding: [{
                    code: this.courseOfTherapy
                }]
            } : undefined,
            note: this.note ? [{ text: this.note }] : undefined
        };

        if (this.isNew) {
            this.fhir.createMedicationRequest(medicationRequest).subscribe({
                next: () => this.router.navigate(['/medication-requests']),
                error: (e) => this.error = e.message || 'Create failed'
            });
        } else if (this.id) {
            medicationRequest.id = this.id; // Add id for update operation
            this.fhir.updateMedicationRequest(this.id, medicationRequest).subscribe({
                next: () => this.router.navigate(['/medication-requests']),
                error: (e) => this.error = e.message || 'Update failed'
            });
        }
    }

    remove() {
        if (!this.id) return;
        if (!confirm('Delete this medication request?')) return;
        this.fhir.deleteMedicationRequest(this.id).subscribe({
            next: () => this.router.navigate(['/medication-requests']),
            error: (e) => this.error = e.message || 'Delete failed'
        });
    }

    cancel() {
        this.router.navigate(['/medication-requests']);
    }
}
