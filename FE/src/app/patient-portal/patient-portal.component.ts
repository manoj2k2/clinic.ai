import { Component, OnInit, OnDestroy } from '@angular/core';
import { FhirService } from '../services/fhir.service';
import { forkJoin, Subject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserPatientService } from '../services/user-patient.service';
import { Roles } from '../services/roles';
import { takeUntil } from 'rxjs/operators';

interface PatientOption {
  id: string;
  label: string;
  isPrimary: boolean;
}

@Component({
  selector: 'app-patient-portal',
  templateUrl: './patient-portal.component.html',
  styleUrls: ['./patient-portal.component.css']
})
export class PatientPortalComponent implements OnInit, OnDestroy {
  patient: any = null;
  selectedPatientId: string | null = null;
  availablePatients: PatientOption[] = [];
  showPatientSelector = false;
  isLoadingPatients = true;
  
  appointments: any[] = [];
  upcomingAppointments: any[] = [];
  pastAppointments: any[] = [];
  results: any[] = [];
  practitionerMap: { [id: string]: string } = {};
  practitionerResources: { [id: string]: any } = {};
  selectedAppointment: any | null = null;
  loading = true;
  error: string | null = null;
  
  // reschedule state
  rescheduleMode = false;
  rescheduleValue: string | null = null;
  public Roles = Roles;

  private destroy$ = new Subject<void>();

  constructor(
    private fhir: FhirService,
    public auth: AuthService,
    private userPatientService: UserPatientService
  ) { }

  ngOnInit() {
    // Initialize user-patient service
    this.userPatientService.initialize();

    // Subscribe to patient list changes
    this.userPatientService.patients$
      .pipe(takeUntil(this.destroy$))
      .subscribe(patientIds => {
        this.updatePatientOptions(patientIds);
        this.isLoadingPatients = false;
      });

    // Subscribe to primary patient changes
    this.userPatientService.primaryPatient$
      .pipe(takeUntil(this.destroy$))
      .subscribe(primaryPatientId => {
        if (primaryPatientId && primaryPatientId !== this.selectedPatientId) {
          this.selectedPatientId = primaryPatientId;
          this.loadPatientData(primaryPatientId);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Update available patient options for selector
   */
  private updatePatientOptions(patientIds: string[]) {
    const primaryId = this.userPatientService.getCurrentPrimaryPatient();
    
    this.availablePatients = patientIds.map(id => ({
      id,
      label: this.formatPatientLabel(id),
      isPrimary: id === primaryId
    }));

    console.log('📋 Available patients for portal:', this.availablePatients);
  }

  /**
   * Format patient ID for display
   */
  private formatPatientLabel(patientId: string): string {
    // If we have loaded this patient's resource, use actual name
    if (this.patient && this.patient.id === patientId && this.patient.name && this.patient.name.length > 0) {
      const name = this.patient.name[0];
      return this.formatName(name);
    }
    
    // Otherwise show ID
    const parts = patientId.split('-');
    const shortId = parts[parts.length - 1] || patientId;
    const isPrimary = patientId === this.userPatientService.getCurrentPrimaryPatient();
    
    return isPrimary ? `Patient ${shortId} ⭐` : `Patient ${shortId}`;
  }

  /**
   * Format FHIR name object
   */
  private formatName(name: any): string {
    if (!name) return 'Unknown';
    if (name.text) return name.text;
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim() || 'Unknown';
  }

  /**
   * Get display name for current patient
   */
  getCurrentPatientName(): string {
    if (!this.patient) {
      return 'No patient selected';
    }
    const name = this.patient.name?.[0];
    if (name) {
      return this.formatName(name);
    }
    return this.formatPatientLabel(this.selectedPatientId || '');
  }

  /**
   * Toggle patient selector dropdown
   */
  togglePatientSelector() {
    if (this.canSwitchPatient()) {
      this.showPatientSelector = !this.showPatientSelector;
    }
  }

  /**
   * Check if patient switching is available
   */
  canSwitchPatient(): boolean {
    return this.availablePatients.length > 1;
  }

  /**
   * Switch to a different patient
   */
  switchPatient(patientId: string) {
    if (patientId === this.selectedPatientId) {
      console.log('👤 Already viewing patient:', patientId);
      return;
    }

    console.log('🔄 Switching patient from', this.selectedPatientId, 'to', patientId);

    // Verify access before switching
    this.userPatientService.hasAccessToPatient(patientId).subscribe(hasAccess => {
      if (!hasAccess) {
        this.error = 'You do not have access to this patient';
        setTimeout(() => this.error = null, 3000);
        return;
      }

      // Set as primary patient
      this.userPatientService.setPrimaryPatient(patientId).subscribe(success => {
        if (success) {
          this.selectedPatientId = patientId;
          this.loadPatientData(patientId);
          
          // Close dropdown
          this.showPatientSelector = false;
        } else {
          this.error = 'Failed to switch patient. Please try again.';
          setTimeout(() => this.error = null, 3000);
        }
      });
    });
  }

  /**
   * Load patient data by ID
   */
  loadPatientData(patientId: string) {
    if (!patientId) {
      this.error = 'No patient selected';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.appointments = [];
    this.results = [];
    this.selectedAppointment = null;

    console.log('📂 Loading data for patient:', patientId);

    // Load patient resource
    this.fhir.getPatient(patientId).subscribe({
      next: (patient: any) => {
        this.patient = patient;
        this.fetchMyRecords(patientId);
        
        // Update patient options with actual names
        this.updatePatientOptions(this.userPatientService.getCurrentPatients());
      },
      error: (err) => {
        console.error('Failed to load patient:', err);
        this.error = 'Failed to load patient profile.';
        this.loading = false;
      }
    });
  }

  fetchMyRecords(patientId: string) {
    // Fetch Appointments
    this.fhir.getAppointmentsForPatient(patientId).subscribe(res => {
      this.appointments = (res.entry || [])
        .map((e: any) => e.resource)
        .filter((a: any) => a.status !== 'cancelled')
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());

      this.groupAppointments();

      // collect referenced practitioner ids and load their details
      const ids = new Set<string>();
      this.appointments.forEach(a => {
        (a.participant || []).forEach((p: any) => {
          const ref = p.actor?.reference;
          if (ref && ref.startsWith('Practitioner/')) {
            ids.add(ref.split('/')[1]);
          }
        });
      });

      if (ids.size > 0) {
        const calls = Array.from(ids).map(id => this.fhir.getPractitioner(id));
        forkJoin(calls).subscribe({ next: (prs: any[]) => {
          prs.forEach(pr => {
            const name = pr.name?.[0];
            const display = name ? (name.text || ((name.given?.[0] || '') + ' ' + (name.family || '')) ) : pr.id;
            this.practitionerMap[pr.id] = display;
            this.practitionerResources[pr.id] = pr;
          });

          // annotate appointments with practitioner display names
          this.appointments.forEach(a => {
            a.practitioners = (a.participant || []).map((p: any) => {
              const ref = p.actor?.reference;
              if (ref && ref.startsWith('Practitioner/')) {
                const id = ref.split('/')[1];
                return this.practitionerMap[id] || id;
              }
              return null;
            }).filter((x: any) => !!x);
          });
        }, error: () => {
          // ignore practitioner lookup errors; continue without names
        }});
      }
    });

    // Fetch Results (DiagnosticReports)
    this.fhir.getDiagnosticReportsForPatient(patientId).subscribe(res => {
      this.results = (res.entry || []).map((e: any) => e.resource);
      this.loading = false;
    }, error => {
      console.error('Failed to load diagnostic reports:', error);
      this.loading = false;
    });
  }

  private groupAppointments() {
    const now = Date.now();
    this.upcomingAppointments = this.appointments.filter(a => {
      try { return a.start && new Date(a.start).getTime() >= now; } catch { return false; }
    }).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    this.pastAppointments = this.appointments.filter(a => {
      try { return a.start && new Date(a.start).getTime() < now; } catch { return false; }
    }).sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }

  selectAppointment(apt: any) {
    this.selectedAppointment = apt;
  }

  clearSelection() {
    this.selectedAppointment = null;
  }

  isFuture(apt: any): boolean {
    if (!apt?.start) { return false; }
    try { return new Date(apt.start).getTime() > Date.now(); } catch { return false; }
  }

  cancelAppointment(apt: any) {
    if (!apt || !apt.id) { return; }
    if (!confirm('Cancel this appointment? This cannot be undone.')) { return; }
    const id = apt.id;
    const updated = { ...apt, status: 'cancelled', id };
    this.fhir.updateAppointment(id, updated).subscribe({ next: () => {
      // refresh list and clear selection
      if (this.selectedPatientId) { this.fetchMyRecords(this.selectedPatientId); }
      this.clearSelection();
    }, error: () => {
      alert('Failed to cancel appointment.');
    }});
  }

  startReschedule() {
    if (!this.selectedAppointment) { return; }
    this.rescheduleMode = true;
    const dt = this.selectedAppointment.start ? new Date(this.selectedAppointment.start) : new Date();
    // prepare value for datetime-local input (YYYY-MM-DDTHH:mm)
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    this.rescheduleValue = local;
  }

  cancelReschedule() {
    this.rescheduleMode = false;
    this.rescheduleValue = null;
  }

  submitReschedule() {
    if (!this.selectedAppointment || !this.rescheduleValue) { return; }
    const id = this.selectedAppointment.id;
    // convert local value to ISO string
    const newDate = new Date(this.rescheduleValue as string);
    const iso = newDate.toISOString();
    const updated = { ...this.selectedAppointment, start: iso, id };
    this.fhir.updateAppointment(id, updated).subscribe({ next: () => {
      if (this.selectedPatientId) { this.fetchMyRecords(this.selectedPatientId); }
      this.rescheduleMode = false;
      this.rescheduleValue = null;
      // reselect updated appointment if present
      setTimeout(() => {
        const found = this.appointments.find(a => a.id === id);
        if (found) { this.selectAppointment(found); }
      }, 200);
    }, error: () => {
      alert('Failed to reschedule appointment.');
    }});
  }

  getSelectedPractitioners(): any[] {
    if (!this.selectedAppointment) { return []; }
    const ids: string[] = (this.selectedAppointment.participant || []).map((p: any) => {
      const ref = p.actor?.reference;
      if (ref && ref.startsWith('Practitioner/')) { return ref.split('/')[1]; }
      return null;
    }).filter((x: any) => !!x);

    return ids.map(id => this.practitionerResources[id]).filter(x => !!x);
  }
}
