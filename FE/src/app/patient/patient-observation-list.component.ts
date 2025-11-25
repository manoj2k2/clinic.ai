import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-observation-list',
  template: `
  <div class="page-container">
    <div class="page-header">
      <h3>Patient Observations</h3>
      <div style="display:flex; gap:12px">
        <button (click)="back()" class="btn btn-secondary">Back to Patient</button>
        <button (click)="addObservation()" class="btn btn-primary">Add New</button>
      </div>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="error" class="error-msg">{{error}}</div>

    <div *ngIf="!loading && observations.length > 0; else none" class="card-grid">
      <div *ngFor="let obs of observations" class="resource-card">
        <div class="card-header">
          <span class="info-value">{{getDisplay(obs.code)}}</span>
          <span class="badge badge-neutral">{{obs.status || 'final'}}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Value:</span>
            <span class="info-value" style="font-size: 16px;">{{getValue(obs)}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">{{obs.effectiveDateTime | date:'medium'}}</span>
          </div>
        </div>
      </div>
    </div>

    <ng-template #none>
      <div class="empty-state" *ngIf="!loading">No observations found.</div>
    </ng-template>
  </div>
  `,
  styles: []
})
export class PatientObservationListComponent implements OnInit {
  patientId: string | null = null;
  observations: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id');
    if (this.patientId) {
      this.loadObservations();
    } else {
      this.error = 'No patient ID provided';
    }
  }

  loadObservations() {
    if (!this.patientId) return;
    this.loading = true;
    this.fhir.getObservationsForPatient(this.patientId).subscribe({
      next: (res: any) => {
        this.observations = res.entry ? res.entry.map((e: any) => e.resource) : [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e.message || 'Failed to load observations';
        this.loading = false;
      }
    });
  }

  getDisplay(code: any): string {
    if (code && code.text) return code.text;
    if (code && code.coding && code.coding.length > 0) return code.coding[0].display || code.coding[0].code;
    return 'Unknown';
  }

  getValue(obs: any): string {
    if (obs.valueQuantity) {
      return `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`;
    }
    if (obs.valueString) return obs.valueString;
    return '';
  }

  addObservation() {
    if (this.patientId) {
      this.router.navigate(['/patients', this.patientId, 'observation']);
    }
  }

  back() {
    if (this.patientId) {
      this.router.navigate(['/patients', this.patientId]);
    } else {
      this.router.navigate(['/patients']);
    }
  }
}
