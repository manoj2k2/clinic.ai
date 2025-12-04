import { Component, Input, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
    selector: 'app-appointment-list',
templateUrl: './appointment-list.component.html',
    styles: []
})
export class AppointmentListComponent implements OnInit {
    appointments: any[] | null = null;
    loading = false;
    error: string | null = null;
    @Input() patientRef: string | null = null;
    @Input() practitionerRef: string | null = null;
  // UI search inputs
  searchPatientInput: string | null = null;
  searchPractitionerInput: string | null = null;

    constructor(private fhir: FhirService) { }
    
    // implementation for searching by patient or practitioner reference can be added here in the future
    searchByPatientRef(patientRef: string): void {
        this.loading = true;
        this.fhir.searchAppointmentsByPatientRef(patientRef).subscribe({
            next: (res: any) => {
                this.appointments = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }
    searchByPractitionerRef(practitionerRef: string): void {
        this.loading = true;
        this.fhir.searchAppointmentsByPractitionerRef(practitionerRef).subscribe({
            next: (res: any) => {
                this.appointments = res.entry || [];
                this.loading = false;
            },
            error: (e) => {
                this.error = e.message || 'Failed';
                this.loading = false;
            }
        });
    }

    // View switching
    viewMode: 'table' | 'calendar' = 'table';
    
    // Calendar logic
    currentWeekStart: Date = new Date();
    weekDays: Date[] = [];

    ngOnInit(): void {
        this.updateWeekDays();
        this.loading = true;
      // If a patient or practitioner reference was supplied as an input, use the FHIR search URL
      if (this.patientRef || this.practitionerRef) {
        const params: { [k: string]: string } = {};
        if (this.patientRef) { params['patient'] = this.patientRef; }
        if (this.practitionerRef) { params['practitioner'] = this.practitionerRef; }
        this.fhir.searchAppointments(params).subscribe({ next: (res: any) => {
          this.appointments = res.entry || [];
          this.loading = false;
        }, error: (e) => {
          this.error = e.message || 'Failed';
          this.loading = false;
        }});
        return;
      }

      this.fhir.getAppointments().subscribe({
        next: (res: any) => {
          this.appointments = res.entry || [];
          this.loading = false;
        },
        error: (e) => {
          this.error = e.message || 'Failed';
          this.loading = false;
        }
      });
    }

    updateWeekDays(): void {
        const start = new Date(this.currentWeekStart);
        // Adjust to start of week (Sunday or Monday, let's assume Monday for business context, or Sunday for US. Let's do Monday)
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(start.setDate(diff));
        
        this.weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            this.weekDays.push(d);
        }
    }

    prevWeek(): void {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.updateWeekDays();
    }

    nextWeek(): void {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.updateWeekDays();
    }

    getAppointmentsForDay(date: Date): any[] {
        if (!this.appointments) return [];
        return this.appointments.filter(a => {
            if (!a.resource?.start) return false;
            const apptDate = new Date(a.resource.start);
            return apptDate.getDate() === date.getDate() &&
                   apptDate.getMonth() === date.getMonth() &&
                   apptDate.getFullYear() === date.getFullYear();
        }).sort((a, b) => new Date(a.resource.start).getTime() - new Date(b.resource.start).getTime());
    }

    doSearch(): void {
      this.loading = true;
      const params: { [k: string]: string } = {};
      if (this.searchPatientInput) { params['patient'] = this.searchPatientInput; }
      if (this.searchPractitionerInput) { params['practitioner'] = this.searchPractitionerInput; }
      if (Object.keys(params).length === 0) {
        // nothing entered, load all
        this.fhir.getAppointments().subscribe({ next: (res: any) => { this.appointments = res.entry || []; this.loading = false; }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
        return;
      }

      this.fhir.searchAppointments(params).subscribe({ next: (res: any) => {
        this.appointments = res.entry || [];
        this.loading = false;
      }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
    }

    onPatientSelected(patientId: string): void {
        this.searchPatientInput = patientId ? `Patient/${patientId}` : null;
        // Optional: auto-search when selected
        // this.doSearch();
    }

    onPractitionerSelected(practitionerId: string): void {
        this.searchPractitionerInput = practitionerId ? `Practitioner/${practitionerId}` : null;
        // Optional: auto-search when selected
        // this.doSearch();
    }

    clearSearch(): void {
      this.searchPatientInput = null;
      this.searchPractitionerInput = null;
      // We might need to clear the resource selectors too, but they don't have a clear input binding from here easily unless we use ViewChild. 
      // For now, we'll just reload all appointments.
      this.loading = true;
      this.fhir.getAppointments().subscribe({ next: (res: any) => { this.appointments = res.entry || []; this.loading = false; }, error: (e) => { this.error = e.message || 'Failed'; this.loading = false; } });
    }
}
