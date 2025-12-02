import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-organization-card',
  templateUrl: './organization-card.component.html',
  styleUrls: ['./organization-card.component.css']
})
export class OrganizationCardComponent {
  @Input() org: any;

  get displayType(): string {
    return this.org?.type?.[0]?.coding?.[0]?.display || this.org?.type?.[0]?.text || '—';
  }

  get displayName(): string {
    return this.org?.name || 'Unknown Name';
  }

  get id(): string { return this.org?.id; }
}
