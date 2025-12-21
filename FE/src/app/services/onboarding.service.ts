import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private chatServiceUrl = 'http://localhost:3001';
  constructor(private http: HttpClient) {}

  registerPractitioner(payload: {
    iamUserId: string;
    fhirPractitionerId: string;
    fhirOrganizationId: string;
  }): Observable<any> {
    return this.http.post(`${this.chatServiceUrl}/api/practitioners/self-onboard`, payload);
  }
}
