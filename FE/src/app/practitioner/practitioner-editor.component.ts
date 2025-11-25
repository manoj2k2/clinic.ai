import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-editor',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Practitioner</h2>
        <h2 *ngIf="!isNew">Edit Practitioner</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        <div class="form-section">
          <div class="form-section-title">Professional Information</div>
          
          <div class="form-row">
            <div class="form-field">
              <label>Given Names</label>
              <input type="text" [(ngModel)]="nameGiven" name="given" placeholder="e.g. Sarah" />
            </div>
            <div class="form-field">
              <label>Family Name</label>
              <input type="text" [(ngModel)]="family" name="family" placeholder="e.g. Smith" />
            </div>
          </div>

          <div class="form-field">
            <label>Qualification</label>
            <input type="text" [(ngModel)]="qualification" name="qualification" placeholder="e.g. MD, Cardiologist" />
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
export class PractitionerEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  error: string | null = null;

  nameGiven = '';
  family = '';
  qualification = '';

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getPractitioner(this.id).subscribe({
        next: (res: any) => {
          this.nameGiven = (res.name && res.name[0] && res.name[0].given) ? res.name[0].given.join(' ') : '';
          this.family = (res.name && res.name[0] && res.name[0].family) ? res.name[0].family : '';
          this.qualification = (res.qualification && res.qualification[0] && res.qualification[0].code) ? res.qualification[0].code.text || '' : '';
          this.loading = false;
        }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
      });
    } else {
      this.isNew = true;
    }
  }

  save() {
    const practitioner: any = {
      resourceType: 'Practitioner',
      name: [{ given: this.nameGiven ? this.nameGiven.split(/\s+/).filter(Boolean) : [], family: this.family }],
      qualification: this.qualification ? [{ code: { text: this.qualification } }] : []
    };

    if (this.isNew) {
      this.fhir.createPractitioner(practitioner).subscribe({ next: () => this.router.navigate(['/practitioners']), error: (e) => this.error = e.message || 'Create failed' });
    } else if (this.id) {
      this.fhir.updatePractitioner(this.id, practitioner).subscribe({ next: () => this.router.navigate(['/practitioners']), error: (e) => this.error = e.message || 'Update failed' });
    }
  }

  remove() {
    if (!this.id) return;
    if (!confirm('Delete this practitioner?')) return;
    this.fhir.deletePractitioner(this.id).subscribe({ next: () => this.router.navigate(['/practitioners']), error: (e) => this.error = e.message || 'Delete failed' });
  }

  cancel() { this.router.navigate(['/practitioners']); }
}