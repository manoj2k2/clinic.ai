import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-patient-observation-list',
    template: `
  <div class="container">
    <div class="header">
      <h3>Patient Observations</h3>
      <button (click)="addObservation()">Add New</button>
      <button (click)="back()">Back to Patient</button>
    </div>

    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error" class="error">{{error}}</div>

    <table *ngIf="!loading && observations.length > 0">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let obs of observations">
          <td>{{obs.effectiveDateTime | date:'medium'}}</td>
          <td>{{getDisplay(obs.code)}}</td>
          <td>{{getValue(obs)}}</td>
        </tr>
      </tbody>
    </table>

    <div *ngIf="!loading && observations.length === 0">
      No observations found.
    </div>
  </div>
  `,
    styles: [
        `
    .container { padding: 12px; }
    .header { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
    h3 { margin: 0; flex-grow: 1; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .error { color: #b00020; }
    `
    ]
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
