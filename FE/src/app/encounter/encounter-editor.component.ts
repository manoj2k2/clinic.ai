import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-encounter-editor',
  template: `
  <div class="editor-container">
    <div class="editor-card">
      <div class="page-header">
        <h2 *ngIf="isNew">Create Encounter</h2>
        <h2 *ngIf="!isNew">Edit Encounter</h2>
      </div>

      <div *ngIf="loading" class="loading">Loading...</div>
      <div *ngIf="error" class="error-msg">{{error}}</div>

      <form *ngIf="!loading" (ngSubmit)="save()">
        
        <div class="form-section">
          <div class="form-section-title">Basic Information</div>
          <div class="form-row">
            <div class="form-field">
              <label>Status</label>
              <select [(ngModel)]="status" name="status" required>
                <option value="planned">Planned</option>
                <option value="arrived">Arrived</option>
                <option value="triaged">Triaged</option>
                <option value="in-progress">In Progress</option>
                <option value="onleave">On Leave</option>
                <option value="finished">Finished</option>
                <option value="cancelled">Cancelled</option>
                <option value="entered-in-error">Entered in Error</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div class="form-field">
              <label>Class</label>
              <select [(ngModel)]="classCode" name="classCode">
                <option value="">-- Select Class --</option>
                <option value="IMP">Inpatient</option>
                <option value="AMB">Ambulatory</option>
                <option value="EMER">Emergency</option>
                <option value="FLD">Field</option>
                <option value="HH">Home Health</option>
                <option value="VR">Virtual</option>
              </select>
            </div>
          </div>

          <div class="form-field">
            <label>Subject (Patient)</label>
            <app-resource-selector resourceType="Patient"
             placeholder="Search Patient"
             [initialValue]="subjectRef"
              (selectedId)="onPatientSelected($event)"></app-resource-selector>
            <div *ngIf="subjectRef" class="mt-1 text-sm text-gray-600">Selected: {{subjectRef}}</div>
          </div>

          <div class="form-field">
            <label>Type</label>
            <input type="text" [(ngModel)]="typeText" name="typeText" placeholder="Specific type of encounter (e.g. e-mail consultation)" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Timing</div>
          <div class="form-row">
            <div class="form-field">
              <label>Start Date/Time</label>
              <input type="datetime-local" [(ngModel)]="start" name="start" />
            </div>
            <div class="form-field">
              <label>End Date/Time</label>
              <input type="datetime-local" [(ngModel)]="end" name="end" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Participants</div>
          <div *ngFor="let participant of participants; let i = index" style="border: 1px solid var(--border-color); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>Participant {{i + 1}}</strong>
              <button type="button" (click)="removeParticipant(i)" class="btn btn-sm btn-danger">Remove</button>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>Individual</label>
                <app-resource-selector resourceType="Practitioner" [name]="'actorRef' + i"
                 placeholder="Search Practitioner"
                 [initialValue]="participant.actorRef"
                  (selectedId)="onParticipantSelected($event, i)"></app-resource-selector>
                  <div *ngIf="participant.actorRef" class="mt-1 text-sm text-gray-600">Selected: {{participant.actorRef}}</div>
              </div>
              <div class="form-field">
                <label>Type</label>
                <select [(ngModel)]="participant.typeCode" [name]="'participantType' + i">
                  <option value="PPRF">Primary Performer</option>
                  <option value="SPRF">Secondary Performer</option>
                  <option value="PART">Participant</option>
                </select>
              </div>
            </div>
          </div>
          <button type="button" (click)="addParticipant()" class="btn btn-secondary">Add Participant</button>
        </div>

        <div class="form-section">
          <div class="form-section-title">Reason</div>
          <div class="form-field">
            <label>Reason Code/Text</label>
            <input type="text" [(ngModel)]="reasonText" name="reasonText" placeholder="Reason for encounter" />
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
export class EncounterEditorComponent implements OnInit {
  isNew = true;
  id: string | null = null;
  loading = false;
  error: string | null = null;

  // Form fields
  status = 'planned';
  classCode = '';
  typeText = '';
  subjectRef = '';
  start = '';
  end = '';
  reasonText = '';

  participants: Array<{ actorRef: string, typeCode: string }> = [];

  constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    
    // Check for query params to pre-fill
    this.route.queryParams.subscribe(params => {
      if (params['subject']) {
        this.subjectRef = params['subject'];
      }
    });

    if (this.id && this.id !== 'new') {
      this.isNew = false;
      this.loading = true;
      this.fhir.getEncounter(this.id).subscribe({
        next: (res: any) => {
          const r = res;
          this.status = r.status || 'planned';
          this.classCode = r.class?.[0]?.coding?.[0]?.code || '';
          this.typeText = r.type?.[0]?.text || r.type?.[0]?.coding?.[0]?.display || '';
          this.subjectRef = r.subject?.reference || '';
          
          this.start = r.period?.start ? r.period.start.slice(0, 16) : '';
          this.end = r.period?.end ? r.period.end.slice(0, 16) : '';
          
          this.reasonText = r.reason?.[0]?.value?.[0]?.concept?.text || '';

          if (r.participant && r.participant.length > 0) {
            this.participants = r.participant.map((p: any) => ({
              actorRef: p.actor?.reference || '',
              typeCode: p.type?.[0]?.coding?.[0]?.code || 'PPRF'
            }));
          }

          this.loading = false;
        },
        error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
      });
    } else {
      // Defaults
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      this.start = now.toISOString().slice(0, 16);
    }
  }

  onPatientSelected(id: string) {
    this.subjectRef = id ? `Patient/${id}` : '';
  }

  onParticipantSelected(id: string, index: number) {
    this.participants[index].actorRef = id ? `Practitioner/${id}` : '';
  }

  addParticipant() {
    this.participants.push({ actorRef: '', typeCode: 'PPRF' });
  }

  removeParticipant(index: number) {
    this.participants.splice(index, 1);
  }

  save() {
    const encounter: any = {
      resourceType: 'Encounter',
      status: this.status,
      class: this.classCode ? [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: this.classCode
        }]
      }] : [],
      type: this.typeText ? [{
        text: this.typeText
      }] : [],
      subject: this.subjectRef ? { reference: this.subjectRef } : undefined,
      period: {
        start: this.start ? new Date(this.start).toISOString() : undefined,
        end: this.end ? new Date(this.end).toISOString() : undefined
      },
      reason: this.reasonText ? [{
        value: [{
          concept: { text: this.reasonText }
        }]
      }] : [],
      participant: this.participants.map(p => ({
        actor: { reference: p.actorRef },
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
            code: p.typeCode
          }]
        }]
      }))
    };

    if (this.isNew) {
      this.fhir.createEncounter(encounter).subscribe({
        next: () => this.router.navigate(['/encounters']),
        error: (e) => this.error = e.message || 'Create failed'
      });
    } else if (this.id) {
      this.fhir.updateEncounter(this.id, encounter).subscribe({
        next: () => this.router.navigate(['/encounters']),
        error: (e) => this.error = e.message || 'Update failed'
      });
    }
  }

  remove() {
    if (!this.id) return;
    if (!confirm('Delete this encounter?')) return;
    this.fhir.deleteEncounter(this.id).subscribe({
      next: () => this.router.navigate(['/encounters']),
      error: (e) => this.error = e.message || 'Delete failed'
    });
  }

  cancel() {
    this.router.navigate(['/encounters']);
  }
}
