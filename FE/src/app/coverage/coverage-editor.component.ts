import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-coverage-editor',
  template: `
  <div class="editor-container">
    <div class="page-header">
      <h3>{{ isEdit ? 'Edit Coverage' : 'New Coverage' }}</h3>
      <button type="button" (click)="cancel()" class="btn btn-secondary">
        <i class="pi pi-times"></i>
        <span>Cancel</span>
      </button>
    </div>

    <form (ngSubmit)="save()" #coverageForm="ngForm" class="form-section">
      <!-- Basic Information -->
      <div class="form-section">
        <h4>Basic Information</h4>
        <div class="p-field">
          <label for="status">Status</label>
          <input id="status" name="status" [(ngModel)]="coverage.resource.status" pInputText required />
        </div>
        <div class="p-field">
          <label for="kind">Kind</label>
          <input id="kind" name="kind" [(ngModel)]="coverage.resource.kind" pInputText />
        </div>
        <div class="p-field">
          <label for="policyHolder">Policy Holder (Reference)</label>
          <input id="policyHolder" name="policyHolder" [(ngModel)]="coverage.resource.policyHolder.reference" pInputText />
        </div>
        <div class="p-field">
          <label for="beneficiary">Beneficiary (Reference)</label>
          <input id="beneficiary" name="beneficiary" [(ngModel)]="coverage.resource.beneficiary.reference" pInputText />
        </div>
        <div class="p-field">
          <label for="insurer">Insurer (Reference)</label>
          <input id="insurer" name="insurer" [(ngModel)]="coverage.resource.insurer.reference" pInputText />
        </div>
        <div class="p-field">
          <label for="periodStart">Coverage Period Start</label>
          <input id="periodStart" name="periodStart" [(ngModel)]="coverage.resource.period.start" type="date" pInputText />
        </div>
        <div class="p-field">
          <label for="periodEnd">Coverage Period End</label>
          <input id="periodEnd" name="periodEnd" [(ngModel)]="coverage.resource.period.end" type="date" pInputText />
        </div>
      </div>

      <!-- Advanced Details (optional) -->
      <div class="form-section">
        <h4>Advanced Details</h4>
        <div class="p-field">
          <label for="statusReason">Status Reason</label>
          <input id="statusReason" name="statusReason" [(ngModel)]="coverage.resource.statusReason" pInputText />
        </div>
        <div class="p-field">
          <label for="order">Order (priority)</label>
          <input id="order" name="order" [(ngModel)]="coverage.resource.order" type="number" pInputText />
        </div>
        <div class="p-field">
          <label for="network">Network</label>
          <input id="network" name="network" [(ngModel)]="coverage.resource.network" pInputText />
        </div>
        <div class="p-field">
          <label for="subrogation">Subrogation</label>
          <p-checkbox id="subrogation" name="subrogation" [(ngModel)]="coverage.resource.subrogation"></p-checkbox>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" [disabled]="coverageForm.invalid" class="btn btn-primary">
          <i class="pi pi-save"></i>
          <span>Save</span>
        </button>
        <button *ngIf="isEdit" type="button" (click)="delete()" class="btn btn-danger">
          <i class="pi pi-trash"></i>
          <span>Delete</span>
        </button>
      </div>
    </form>
  </div>
  `,
  styles: []
})
export class CoverageEditorComponent implements OnInit {
  coverage: any = {
    resource: {
      resourceType: 'Coverage',
      status: 'active',
      kind: 'insurance',
      policyHolder: {},
      beneficiary: {},
      insurer: {},
      period: {}
    }
  };
  isEdit = false;
  id: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fhir: FhirService
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.id;
    if (this.isEdit && this.id) {
      this.fhir.getCoverage(this.id).subscribe({
        next: (res: any) => {
          this.coverage = res;
          // Ensure nested objects exist to avoid template errors
          if (!this.coverage.resource.policyHolder) this.coverage.resource.policyHolder = {};
          if (!this.coverage.resource.beneficiary) this.coverage.resource.beneficiary = {};
          if (!this.coverage.resource.insurer) this.coverage.resource.insurer = {};
          if (!this.coverage.resource.period) this.coverage.resource.period = {};
        },
        error: (e) => {
          console.error('Failed to load coverage', e);
        }
      });
    }
  }

  save(): void {
    if (this.isEdit && this.id) {
      // Ensure ID is present in the resource for update
      this.coverage.resource.id = this.id;
      this.fhir.updateCoverage(this.id, this.coverage).subscribe({
        next: () => this.router.navigate(['/coverages']),
        error: (e) => console.error('Update failed', e)
      });
    } else {
      this.fhir.createCoverage(this.coverage).subscribe({
        next: () => this.router.navigate(['/coverages']),
        error: (e) => console.error('Create failed', e)
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/coverages']);
  }

  delete(): void {
    if (this.id) {
      this.fhir.deleteCoverage(this.id).subscribe({
        next: () => this.router.navigate(['/coverages']),
        error: (e) => console.error('Delete failed', e)
      });
    }
  }
}
