import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-editor',
  template: `
  <div class="editor">
    <h3 *ngIf="isNew">Create Practitioner</h3>
    <h3 *ngIf="!isNew">Edit Practitioner</h3>

    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error" class="error">{{error}}</div>

    <form *ngIf="!loading" (ngSubmit)="save()">
      <div class="field">
        <label>Given Names</label>
        <input type="text" [(ngModel)]="nameGiven" name="given" />
      </div>
      <div class="field">
        <label>Family Name</label>
        <input type="text" [(ngModel)]="family" name="family" />
      </div>
      <div class="field">
        <label>Qualification / Role</label>
        <input type="text" [(ngModel)]="qualification" name="qualification" />
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
    .editor { padding:12px; max-width:600px }
    .field { margin-bottom:8px }
    label { display:block; font-weight:600; margin-bottom:4px }
    input { width:100%; padding:6px }
    .actions { margin-top:10px; display:flex; gap:8px }
    .danger { background:#b00020; color:white }
    `
  ]
})
export class PractitionerEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  error: string | null = null;

  nameGiven = '';
  family = '';
  qualification = '';

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getPractitioner(this.id).subscribe({ next: (res:any) => {
        this.nameGiven = (res.name && res.name[0] && res.name[0].given) ? res.name[0].given.join(' ') : '';
        this.family = (res.name && res.name[0] && res.name[0].family) ? res.name[0].family : '';
        this.qualification = (res.qualification && res.qualification[0] && res.qualification[0].code && res.qualification[0].code.text) ? res.qualification[0].code.text : '';
        this.loading = false;
      }, error: (e) => { this.error = e.message || 'Failed to load practitioner'; this.loading = false; } });
    } else {
      this.isNew = true;
    }
  }

  save() {
    const practitioner: any = {
      resourceType: 'Practitioner',
      name: [{ given: this.nameGiven ? this.nameGiven.split(/\s+/).filter(Boolean) : [], family: this.family }],
      qualification: this.qualification ? [{ code: { text: this.qualification } }] : undefined
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
