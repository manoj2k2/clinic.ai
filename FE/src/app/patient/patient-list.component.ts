import { Component, OnInit } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styles: []
})
export class PatientListComponent implements OnInit {
  patients: any[] | null = null;
  loading = false;
  error: string | null = null;
  searchQuery: string | null = null;

  constructor(private fhir: FhirService) { }

  ngOnInit(): void {
    this.loading = true;
    this.fhir.getPatients().subscribe({
      next: (res: any) => {
        console.log('Fetched patients:', res);
        this.patients = res.entry || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to fetch patients';
        this.loading = false;
      }
    });
  }

  doSearch(): void {
    this.loading = true;
    this.error = null;
    const q = (this.searchQuery || '').trim();
    if (!q) {
      this.fhir.getPatients().subscribe({ next: (res: any) => { this.patients = res.entry || []; this.loading = false; }, error: (err) => { this.error = err.message || 'Search failed'; this.loading = false; } });
      return;
    }

    // search by name or identifier
    const params: { [k: string]: string } = { name: q };
    // if query looks like an identifier (contains digits), also try identifier
    if (/\d/.test(q)) { params['identifier'] = q; }

    this.fhir.searchPatients(params).subscribe({ next: (res: any) => { this.patients = res.entry || []; this.loading = false; }, error: (err) => { this.error = err.message || 'Search failed'; this.loading = false; } });
  }

  clearSearch(): void {
    this.searchQuery = null;
    this.loading = true;
    this.fhir.getPatients().subscribe({ next: (res: any) => { this.patients = res.entry || []; this.loading = false; }, error: (err) => { this.error = err.message || 'Failed to fetch patients'; this.loading = false; } });
  }
}
