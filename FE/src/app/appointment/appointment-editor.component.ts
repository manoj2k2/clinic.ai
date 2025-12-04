import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-appointment-editor',
    templateUrl: './appointment-editor.component.html',
    styles: []
})
export class AppointmentEditorComponent implements OnInit {
    isNew = true;
    id: string | null = null;
    loading = false;
    error: string | null = null;

    // Form fields
    status = 'booked';
    priorityCode = '';
    priorityDisplay = '';
    description = '';
    subjectRef = '';

    serviceCategoryCode = '';
    serviceCategoryDisplay = '';
    appointmentTypeCode = '';
    appointmentTypeDisplay = '';
    serviceTypeText = '';
    specialtyText = '';

    start = '';
    // keep end to start + minutesDuration  
    end = '';
    minutesDuration = 30;
    created = '';

    reasonText = '';
    note = '';
    patientInstruction = '';

    participants: Array<{ actorRef: string, status: string, required: boolean }> = [];

    priorityOptions = [
        { code: 'routine', display: 'Routine' },
        { code: 'urgent', display: 'Urgent' },
        { code: 'asap', display: 'ASAP' },
        { code: 'stat', display: 'STAT' }
    ];

    serviceCategoryOptions = [
        { code: '1', display: 'Adoption' },
        { code: '2', display: 'Aged Care' },
        { code: '8', display: 'Counselling' },
        { code: '10', display: 'Dental' },
        { code: '17', display: 'General Practice' },
        { code: '27', display: 'Specialist Medical' },
        { code: '57', display: 'Physiotherapy' }
    ];

    appointmentTypeOptions = [
        { code: 'CHECKUP', display: 'Check Up' },
        { code: 'EMERGENCY', display: 'Emergency' },
        { code: 'FOLLOWUP', display: 'Follow Up' },
        { code: 'ROUTINE', display: 'Routine' },
        { code: 'WALKIN', display: 'Walk In' }
    ];

    constructor(private route: ActivatedRoute, private router: Router, private fhir: FhirService) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
         // Check for query params to pre-fill
    this.route.queryParams.subscribe(params => {
      if (params['SubjectRef']) {
        this.subjectRef = params['SubjectRef'];
      } 
      if (params['participant.actor']) {
        this.participants = [{ actorRef: params['participant.actor'], status: 'needs-action', required: true }];
      }
    });
        if (this.id && this.id !== 'new') {
            this.isNew = false;
            this.loading = true;
            this.fhir.getAppointment(this.id).subscribe({
                next: (res: any) => {
                    const r = res;

                    this.status = r.status || 'booked';
                    this.priorityCode = r.priority?.coding?.[0]?.code || '';
                    this.priorityDisplay = r.priority?.coding?.[0]?.display || '';
                    this.description = r.description || '';
                    this.subjectRef = r.subject?.reference || '';

                    this.serviceCategoryCode = r.serviceCategory?.[0]?.coding?.[0]?.code || '';
                    this.serviceCategoryDisplay = r.serviceCategory?.[0]?.coding?.[0]?.display || '';
                    this.appointmentTypeCode = r.appointmentType?.coding?.[0]?.code || '';
                    this.appointmentTypeDisplay = r.appointmentType?.coding?.[0]?.display || '';
                    this.serviceTypeText = r.serviceType?.[0]?.concept?.text || '';
                    this.specialtyText = r.specialty?.[0]?.text || '';

                    this.start = r.start ? r.start.slice(0, 16) : '';
                    this.end = r.end ? r.end.slice(0, 16) : '';
                    this.minutesDuration = r.minutesDuration || 30;
                    this.created = r.created ? r.created.slice(0, 16) : '';

                    this.reasonText = r.reason?.[0]?.concept?.text || '';
                    this.note = r.note?.[0]?.text || '';
                    this.patientInstruction = r.patientInstruction?.[0]?.concept?.text || '';

                    if (r.participant && r.participant.length > 0) {
                      this.participants = r.participant.map((p: any) => ({
                        actorRef: p.actor?.reference || '',
                        status: p.status || 'needs-action',
                        // FHIR stores `required` as code: 'required' | 'optional' | 'information-only'
                        // map to boolean for the UI: true => 'required', false => 'optional'
                        required: p.required === 'required'
                      }));
                    }

                    this.loading = false;
                }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; }
            });
        } else {
            // Set default times
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            this.created = now.toISOString().slice(0, 16);

            // Default start time to 1 hour from now
            const startTime = new Date(now.getTime() + 60 * 60 * 1000);
            this.start = startTime.toISOString().slice(0, 16);

            // Default end time to 1.5 hours from now
            const endTime = new Date(now.getTime() + 90 * 60 * 1000);
            this.end = endTime.toISOString().slice(0, 16);
        }
    }

    onPatientSelected(id: string) {
        // store as a full reference used by Appointment.subject.reference
        this.subjectRef = id ? `Patient/${id}` : '';
    }
    
    onParticipantSelected(id: string, index: number) {
        this.participants[index].actorRef = id ? `Practitioner/${id}` : '';
    }

    onPriorityChange() {
        const selected = this.priorityOptions.find(p => p.code === this.priorityCode);
        if (selected) {
            this.priorityDisplay = selected.display;
        }
    }

    onServiceCategoryChange() {
        const selected = this.serviceCategoryOptions.find(c => c.code === this.serviceCategoryCode);
        if (selected) {
            this.serviceCategoryDisplay = selected.display;
        }
    }

    onAppointmentTypeChange() {
        const selected = this.appointmentTypeOptions.find(t => t.code === this.appointmentTypeCode);
        if (selected) {
            this.appointmentTypeDisplay = selected.display;
        }
    }

    addParticipant() {
        this.participants.push({ actorRef: '', status: 'needs-action', required: true });
    }

    removeParticipant(index: number) {
        this.participants.splice(index, 1);
    }

    updateEndTime() {
        if (!this.start) return;
        const startDate = new Date(this.start);
        const endDate = new Date(startDate.getTime() + this.minutesDuration * 60000);
        // Adjust for timezone offset to keep the local time string correct
        const tzOffset = endDate.getTimezoneOffset() * 60000;
        const localEndDate = new Date(endDate.getTime() - tzOffset);
        this.end = localEndDate.toISOString().slice(0, 16);
    }

    save() {
        const appointment: any = {
            resourceType: 'Appointment',
            status: this.status,
            priority: this.priorityCode ? {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
                    code: this.priorityCode,
                    display: this.priorityDisplay
                }]
            } : undefined,
            description: this.description,
            subject: this.subjectRef ? { reference: this.subjectRef } : undefined,
            serviceCategory: this.serviceCategoryCode ? [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/service-category',
                    code: this.serviceCategoryCode,
                    display: this.serviceCategoryDisplay
                }]
            }] : [],
            appointmentType: this.appointmentTypeCode ? {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
                    code: this.appointmentTypeCode,
                    display: this.appointmentTypeDisplay
                }]
            } : undefined,
            serviceType: this.serviceTypeText ? [{
                concept: { text: this.serviceTypeText }
            }] : [],
            specialty: this.specialtyText ? [{
                text: this.specialtyText
            }] : [],
            start: this.start ? new Date(this.start).toISOString() : undefined,
            end: this.end ? new Date(this.end).toISOString() : undefined,
            minutesDuration: this.minutesDuration,
            created: this.created ? new Date(this.created).toISOString() : undefined,
            reason: this.reasonText ? [{
                concept: { text: this.reasonText }
            }] : [],
            note: this.note ? [{ text: this.note }] : [],
            patientInstruction: this.patientInstruction ? [{
                concept: { text: this.patientInstruction }
            }] : [],
            participant: this.participants.map(p => ({
              actor: { reference: p.actorRef },
              status: p.status,
              // convert UI boolean back to FHIR code
              required: p.required ? 'required' : 'optional'
            }))
        };

        if (this.isNew) {
            this.fhir.createAppointment(appointment).subscribe({ next: () => this.router.navigate(['/appointments']), error: (e) => this.error = e.message || 'Create failed' });
        } else if (this.id) {
            this.fhir.updateAppointment(this.id, appointment).subscribe({ next: () => this.router.navigate(['/appointments']), error: (e) => this.error = e.message || 'Update failed' });
        }
    }

    remove() {
        if (!this.id) return;
        if (!confirm('Delete this appointment?')) return;
        this.fhir.deleteAppointment(this.id).subscribe({ next: () => this.router.navigate(['/appointments']), error: (e) => this.error = e.message || 'Delete failed' });
    }

    cancel() { this.router.navigate(['/appointments']); }
}
