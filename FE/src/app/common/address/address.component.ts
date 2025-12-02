import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.css']
})
export class AddressComponent {
  /**
   * Accepts either a single Address object or an array of Address objects
   * (FHIR `Address` structure). If an array is provided, the first entry
   * is used for simple display. For richer UIs we could render all entries.
   */
  @Input() address: any; // Address | Address[] | undefined

  displayLine(addr: any): string {
    if (!addr) return '';
    if (Array.isArray(addr.line)) return addr.line.join(', ');
    return addr.line || '';
  }

  displayCity(addr: any): string {
    return addr?.city || '';
  }

  displayPostal(addr: any): string {
    return addr?.postalCode || '';
  }

  displayCountry(addr: any): string {
    return addr?.country || '';
  }

  /** Returns the primary address object to use for display */
  primary(): any {
    console.log("Address input:", this.address);
    if (!this.address) return null;
    return Array.isArray(this.address) ? this.address[0] : this.address;
  }
}
