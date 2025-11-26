import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-portal',
  templateUrl: './practitioner-portal.component.html',
  styleUrls: ['./practitioner-portal.component.css']
})
export class practitionerPortalDashboardComponent implements OnInit {
  stats = {
    patients: 0,
    appointments: 0,
    practitioners: 0
  };
  upcomingAppointments: any[] = [];
  loading = true;

  constructor(private fhir: FhirService) { }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;

    // ForkJoin could be used here, but keeping it simple for now
    this.fhir.getPatients().subscribe(res => {
      this.stats.patients = res.total || (res.entry ? res.entry.length : 0);
    });

    this.fhir.getPractitioners().subscribe(res => {
      this.stats.practitioners = res.total || (res.entry ? res.entry.length : 0);
    });

    this.fhir.getAppointments().subscribe(res => {
      const entries = res.entry || [];
      this.stats.appointments = res.total || entries.length;

      // Filter for future appointments and take top 5
      // Note: In a real app, this filtering should happen on the server side
      this.upcomingAppointments = entries
        .map((e: any) => e.resource)
        .filter((a: any) => a.status !== 'cancelled')
        .slice(0, 5);

      this.loading = false;
    });
  }
}
