import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class FhirService {
  constructor(private http: HttpClient) { 
    
  }

  getPatients(): Observable<any> {
    // Proxy will forward /fhir to the HAPI server at localhost:8082
    //&birthdate=1980-01-01
    return this.http.get('/fhir/Patient?family=sahani');
  }

  getAppointmentsForPatient(patientId: string): Observable<any> {
    return this.http.get(`/fhir/Appointment?patient=Patient/${patientId}`);
  }
}
