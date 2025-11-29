import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-location-list',
  template: `
  <div class="page">
    <div class="page-header">
      <h2>Locations</h2>
      <div style="margin-left:auto"><button class="btn btn-primary" (click)="create()">New Location</button></div>
    </div>

    <div *ngIf="loading" class="loading">Loading...</div>
    <div *ngIf="!loading">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Address</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of locations">
            <td>{{ l.name || l.identifier?.[0]?.value || l.id }}</td>
            <td>{{   t.text     }}</td>
            <td>{{ l.address?.text || l.address?.line?.join(' ') }}</td>
            <td style="text-align:right">
              <button class="btn btn-sm" (click)="edit(l.id)">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `
})
export class LocationListComponent implements OnInit {
  locations: any[] = [];
  loading = false;
  constructor(private fhir: FhirService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.fhir.getLocations().subscribe({ next: (res: any) => {
        this.locations = (res.entry || []).map((e: any) => e.resource);
        this.loading = false;
      }, error: () => this.loading = false
    });
  }

  create() { this.router.navigate(['/locations/new']); }
  edit(id: string) { this.router.navigate(['/locations', id]); }
}
