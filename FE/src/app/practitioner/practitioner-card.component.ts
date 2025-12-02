import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-practitioner-card',
  templateUrl: './practitioner-card.component.html',
  styleUrls: ['./practitioner-card.component.css']
})
export class PractitionerCardComponent implements OnChanges {
  @Input() practitioner: any | undefined;

  organizations: any[] = [];

  constructor(private fhir: FhirService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['practitioner'] && this.practitioner?.id) {
      this.loadOrganizationForPractitioner(this.practitioner.id);
    }
  }

  private loadOrganizationForPractitioner(practitionerId: string) {
    this.organizations = [];
    this.fhir.getPractitionerRolesForPractitioner(practitionerId).subscribe({ next: (res: any) => {
      const entries = res.entry || [];
      const orgIds = new Set<string>();
      entries.forEach((e: any) => {
        const orgRef = e.resource?.organization?.reference;
        if (orgRef && orgRef.startsWith('Organization/')) {
          orgIds.add(orgRef.split('/')[1]);
        }
      });

      if (orgIds.size === 0) { return; }

      Array.from(orgIds).forEach(id => {
        this.fhir.getOrganization(id).subscribe({ next: (org: any) => {
          this.organizations.push(org);
        }, error: () => { /* ignore org fetch errors */ } });
      });
    }, error: () => { /* ignore role lookup errors */ } });
  }
}
