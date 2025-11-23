import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-editor',
  template: `
  <div class="editor">
    <h3 *ngIf="isNew">Create Patient</h3>
    <h3 *ngIf="!isNew">Edit Patient</h3>

    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error" class="error">{{error}}</div>

    <form *ngIf="!loading" (ngSubmit)="save()">
      <div class="field">
        <label>Given Names</label>
        <input type="text" [(ngModel)]="nameGiven" name="given" placeholder="e.g. John Paul" />
      </div>

      <div class="field">
        <label>Family Name</label>
        <input type="text" [(ngModel)]="family" name="family" />
      </div>

      <div class="field">
        <label>Birth Date</label>
        <input type="date" [(ngModel)]="birthDate" name="birthDate" />
      </div>

      <div class="field">
        <label>Gender</label>
        <select [(ngModel)]="gender" name="gender">
          <option value="">--</option>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="other">other</option>
          <option value="unknown">unknown</option>
        </select>
      </div>

      <div class="actions">
        <button type="submit">Save</button>
        <button type="button" (click)="cancel()">Cancel</button>
        <button *ngIf="!isNew" type="button" (click)="remove()" class="danger">Delete</button>
      </div>
    </form>
  </div>
  `,
  styles: [
    `
    .editor { padding: 12px; max-width: 560px; }
    .field { margin-bottom: 10px; }
    label { display:block; font-weight:600; margin-bottom:4px }
    input, select { width:100%; padding:6px 8px; box-sizing:border-box }
    .actions { margin-top:12px; display:flex; gap:8px }
    .danger { background:#b00020; color:white }
    .error { color:#b00020 }
    `
  ]
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

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) {}

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
}
