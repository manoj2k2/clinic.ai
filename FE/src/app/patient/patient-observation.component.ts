import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-observation',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2>Record Observation</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        <div class="form-section">
          <div class="form-field">
            <label>Observation Type</label>
            <select [(ngModel)]="code" name="code">
              <option value="body-weight">Body Weight</option>
              <option value="blood-pressure">Blood Pressure</option>
              <option value="heart-rate">Heart Rate</option>
              <option value="temperature">Body Temperature</option>
            </select>
          </div>

          <div class="form-field">
            <label>Value ({{codeMap[code]?.unit}})</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="text" [(ngModel)]="value" name="value" placeholder="e.g. 70" style="flex:1" />
              <span style="font-weight: 600; color: var(--text-secondary);">{{codeMap[code]?.unit}}</span>
            </div>
          </div>

          <div class="form-field">
            <label>Date</label>
            <input type="datetime-local" [(ngModel)]="date" name="date" />
          </div>
        </div>

        <div class="actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px">
          <button type="button" (click)="cancel()" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: []
})
export class PatientObservationComponent implements OnInit {
  patientId: string | null = null;
  loading = false;
  error: string | null = null;

  code = 'body-weight';
  value = '';
  date = '';

  codeMap: any = {
    'body-weight': { code: '29463-7', display: 'Body Weight', unit: 'kg' },
    'blood-pressure': { code: '85354-9', display: 'Blood Pressure', unit: 'mmHg' },
    'heart-rate': { code: '8867-4', display: 'Heart Rate', unit: 'beats/min' },
    'temperature': { code: '8310-5', display: 'Body Temperature', unit: 'C' }
  };

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id');
    if (!this.patientId) {
      this.error = 'No patient ID provided';
    }
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.date = now.toISOString().slice(0, 16);
  }

  save() {
    if (!this.patientId) return;

    const selectedCode = this.codeMap[this.code] || { code: this.code, display: this.code, unit: 'unit' };

    const observation: any = {
      resourceType: 'Observation',
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: selectedCode.code,
            display: selectedCode.display
          }
        ],
        text: selectedCode.display
      },
      subject: {
        reference: `Patient/${this.patientId}`
      },
      effectiveDateTime: new Date(this.date).toISOString(),
      valueQuantity: {
        value: parseFloat(this.value),
        unit: selectedCode.unit,
        system: 'http://unitsofmeasure.org',
        code: selectedCode.unit
      }
    };

    // Fallback if value is not a number
    if (isNaN(observation.valueQuantity.value)) {
      delete observation.valueQuantity;
      observation.valueString = this.value;
    }

    this.loading = true;
    this.fhir.createObservation(observation).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/patients', this.patientId]);
      },
      error: (e) => {
        this.loading = false;
        this.error = e.message || 'Failed to save observation';
      }
    });
  }

  cancel() {
    if (this.patientId) {
      this.router.navigate(['/patients', this.patientId]);
    } else {
      this.router.navigate(['/patients']);
    }
  }
}
