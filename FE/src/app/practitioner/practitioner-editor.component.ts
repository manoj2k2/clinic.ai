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
          <div class="form-section-title">Personal Information</div>
          <div class="form-row">
            <div class="form-field">
              <label>Prefix</label>
              <input type="text" [(ngModel)]="prefix" name="prefix" placeholder="e.g. Dr." />
            </div>
            <div class="form-field">
              <label>Given Names</label>
              <input type="text" [(ngModel)]="nameGiven" name="given" placeholder="e.g. Arend" />
            </div>
            <div class="form-field">
              <label>Family Name</label>
              <input type="text" [(ngModel)]="family" name="family" placeholder="e.g. Bronsig" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Gender</label>
              <select [(ngModel)]="gender" name="gender">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div class="form-field">
              <label>Birth Date</label>
              <input type="date" [(ngModel)]="birthDate" name="birthDate" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Professional Information</div>
          <div class="form-field">
            <label>Qualification</label>
            <select [(ngModel)]="qualificationCode" name="qualificationCode" (change)="onQualificationChange()">
              <option value="">-- Select Qualification --</option>
              <option *ngFor="let q of qualificationOptions" [value]="q.code">{{q.display}}</option>
            </select>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label>Identifier Value</label>
              <input type="text" [(ngModel)]="identifierValue" name="identifierValue" placeholder="e.g. 12345678901" />
            </div>
            <div class="form-field">
              <label>Identifier System</label>
              <input type="text" [(ngModel)]="identifierSystem" name="identifierSystem" placeholder="urn:oid:..." />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Contact Information</div>
          <div class="form-row">
            <div class="form-field">
              <label>Phone</label>
              <input type="text" [(ngModel)]="telecomValue" name="telecomValue" placeholder="e.g. +31715269111" />
            </div>
            <div class="form-field">
              <label>Use</label>
              <select [(ngModel)]="telecomUse" name="telecomUse">
                <option value="work">Work</option>
                <option value="home">Home</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Address</div>
          <div class="form-field">
            <label>Line (comma separated)</label>
            <input type="text" [(ngModel)]="addressLine" name="addressLine" placeholder="e.g. Walvisbaai 3, C4 - Automatisering" />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>City</label>
              <input type="text" [(ngModel)]="addressCity" name="addressCity" placeholder="e.g. Den helder" />
            </div>
            <div class="form-field">
              <label>Postal Code</label>
              <input type="text" [(ngModel)]="addressPostalCode" name="addressPostalCode" placeholder="e.g. 2333ZA" />
            </div>
          </div>
          <div class="form-field">
            <label>Country</label>
            <input type="text" [(ngModel)]="addressCountry" name="addressCountry" placeholder="e.g. NLD" />
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

  // Form fields
  prefix = '';
  nameGiven = '';
  family = '';
  gender = 'male';
  birthDate = '';

  identifierValue = '';
  identifierSystem = '';

  qualificationCode = '';
  qualificationDisplay = '';

  telecomValue = '';
  telecomUse = 'work';

  addressLine = '';
  addressCity = '';
  addressPostalCode = '';
  addressCountry = '';

  qualificationOptions = [
    { code: '41672002', display: 'Pulmonologist' },
    { code: '394580004', display: 'Clinical genetics' },
    { code: '394581000', display: 'Community medicine' },
    { code: '394582007', display: 'Dermatology' },
    { code: '394583002', display: 'Endocrinology' },
    { code: '394584008', display: 'Gastroenterology' },
    { code: '394585009', display: 'Obstetrics and gynecology' },
    { code: '394586005', display: 'Gynecology' },
    { code: '394589003', display: 'Nephrology' },
    { code: '394591006', display: 'Neurology' },
    { code: '394609007', display: 'Surgery-General' },
    { code: '394611003', display: 'Urology' }
  ];

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getPractitioner(this.id).subscribe({
        next: (res: any) => {
          const r = res;

          // Name
          if (r.name && r.name.length > 0) {
            this.nameGiven = r.name[0].given ? r.name[0].given.join(' ') : '';
            this.family = r.name[0].family || '';
            this.prefix = r.name[0].prefix ? r.name[0].prefix.join(' ') : '';
          }

          this.gender = r.gender || 'male';
          this.birthDate = r.birthDate || '';

          // Identifier
          if (r.identifier && r.identifier.length > 0) {
            this.identifierValue = r.identifier[0].value || '';
            this.identifierSystem = r.identifier[0].system || '';
          }

          // Qualification
          if (r.qualification && r.qualification.length > 0 && r.qualification[0].code && r.qualification[0].code.coding && r.qualification[0].code.coding.length > 0) {
            this.qualificationCode = r.qualification[0].code.coding[0].code || '';
            this.qualificationDisplay = r.qualification[0].code.coding[0].display || '';
          }

          // Telecom
          if (r.telecom && r.telecom.length > 0) {
            this.telecomValue = r.telecom[0].value || '';
            this.telecomUse = r.telecom[0].use || 'work';
          }

          // Address
          if (r.address && r.address.length > 0) {
            this.addressLine = (r.address[0].line && r.address[0].line.length > 0) ? r.address[0].line.join(', ') : '';
            this.addressCity = r.address[0].city || '';
            this.addressPostalCode = r.address[0].postalCode || '';
            this.addressCountry = r.address[0].country || '';
          }

          this.loading = false;
        }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
      });
    } else {
      this.isNew = true;
    }
  }

  onQualificationChange() {
    const selected = this.qualificationOptions.find(q => q.code === this.qualificationCode);
    if (selected) {
      this.qualificationDisplay = selected.display;
    } else {
      this.qualificationDisplay = '';
    }
  }

  save() {
    const practitioner: any = {
      resourceType: 'Practitioner',
      active: true,
      identifier: [{
        use: 'official',
        system: this.identifierSystem,
        value: this.identifierValue,
        type: { text: 'UZI-nummer' }
      }],
      name: [{
        use: 'official',
        text: `${this.prefix} ${this.nameGiven} ${this.family}`.trim(),
        family: this.family,
        given: this.nameGiven ? this.nameGiven.split(/\s+/).filter(Boolean) : [],
        prefix: this.prefix ? this.prefix.split(/\s+/).filter(Boolean) : []
      }],
      gender: this.gender,
      birthDate: this.birthDate,
      telecom: [{
        system: 'phone',
        value: this.telecomValue,
        use: this.telecomUse
      }],
      address: [{
        use: 'work',
        line: this.addressLine ? this.addressLine.split(',').map(s => s.trim()).filter(Boolean) : [],
        city: this.addressCity,
        postalCode: this.addressPostalCode,
        country: this.addressCountry
      }],
      qualification: [{
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: this.qualificationCode,
            display: this.qualificationDisplay
          }]
        }
      }]
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