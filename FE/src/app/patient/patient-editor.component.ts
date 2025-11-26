import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-editor',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Patient</h2>
        <h2 *ngIf="!isNew">Edit Patient</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        <div class="form-section">
          <div class="form-section-title">Personal Information</div>
          
          <div class="form-row">
            <div class="form-field">
              <label>Given Names</label>
              <input type="text" [(ngModel)]="nameGiven" name="given" placeholder="e.g. John Paul" />
            </div>
            <div class="form-field">
              <label>Family Name</label>
              <input type="text" [(ngModel)]="family" name="family" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Birth Date</label>
              <input type="date" [(ngModel)]="birthDate" name="birthDate" />
            </div>
            <div class="form-field">
              <label>Gender</label>
              <select [(ngModel)]="gender" name="gender">
                <option value="">-- Select --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        <div class="actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px">
          <button type="button" (click)="cancel()" class="btn btn-secondary">Cancel</button>
          <button *ngIf="!isNew" type="button" (click)="remove()" class="btn btn-danger">Delete</button>
          <button *ngIf="!isNew" type="button" (click)="viewObservations()" class="btn btn-outline">Observations</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: []
})
export class PatientEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  error: string | null = null;

  // form fields
  nameGiven = '';
  family = '';
  birthDate = '';
  gender = '';

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getPatient(this.id).subscribe({
        next: (res: any) => {
          // res is a Patient resource
          this.nameGiven = (res.name && res.name[0] && res.name[0].given) ? res.name[0].given.join(' ') : '';
          this.family = (res.name && res.name[0] && res.name[0].family) ? res.name[0].family : '';
          this.birthDate = res.birthDate || '';
          this.gender = res.gender || '';
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load patient';
          this.loading = false;
        }
      });
    } else {
      this.isNew = true;
    }
  }

  save() {
    const patient: any = {
      resourceType: 'Patient',
      name: [{ given: this.nameGiven ? this.nameGiven.split(/\s+/).filter(Boolean) : [], family: this.family }],
      birthDate: this.birthDate || undefined,
      gender: this.gender || undefined
    };

    if (this.isNew) {
      this.fhir.createPatient(patient).subscribe({ next: () => this.router.navigate(['/patients']), error: (e) => this.error = e.message || 'Create failed' });
    } else if (this.id) {
      patient.id = this.id; // Add id for update operation
      this.fhir.updatePatient(this.id, patient).subscribe({ next: () => this.router.navigate(['/patients']), error: (e) => this.error = e.message || 'Update failed' });
    }
  }

  remove() {
    if (!this.id) { return; }
    if (!confirm('Delete this patient?')) { return; }
    this.fhir.deletePatient(this.id).subscribe({ next: () => this.router.navigate(['/patients']), error: (e) => this.error = e.message || 'Delete failed' });
  }

  cancel() {
    this.router.navigate(['/patients']);
  }

  viewObservations() {
    if (this.id) {
      this.router.navigate(['/patients', this.id, 'observations']);
    }
  }
}
