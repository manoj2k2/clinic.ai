import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PatientInfo {
  id: string;
  name?: string;
  relationship?: string;
  isPrimary: boolean;
}

export interface UserPatientMapping {
  id: number;
  user_id: string;
  patient_id: string;
  is_primary: boolean;
  relationship?: string;
  access_level?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserPatientService {
  private chatServiceUrl = 'http://localhost:3001/api';
  private patientsSubject = new BehaviorSubject<string[]>([]);
  private primaryPatientSubject = new BehaviorSubject<string | null>(null);

  public patients$ = this.patientsSubject.asObservable();
  public primaryPatient$ = this.primaryPatientSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get all patients accessible to the current user
   */
  getUserPatients(forceRefresh = false): Observable<string[]> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return new Observable(observer => observer.next([]));
    }

    // Return cached if available
    if (!forceRefresh && this.patientsSubject.value.length > 0) {
      return new Observable(observer => observer.next(this.patientsSubject.value));
    }

    return this.http.get<any>(`${this.chatServiceUrl}/users/${userId}/patients`).pipe(
      map(response => response.patientIds || []),
      tap(patientIds => {
        this.patientsSubject.next(patientIds);
        console.log('📋 Loaded patients:', patientIds);
      }),
      catchError((error) => {
        console.error('Failed to load patients:', error);
        return new Observable(observer => observer.next([]));
      })
    );
  }

  /**
   * Get the primary patient for the current user
   */
  getPrimaryPatient(forceRefresh = false): Observable<string | null> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return new Observable(observer => observer.next(null));
    }

    // Return cached if available
    if (!forceRefresh && this.primaryPatientSubject.value) {
      return new Observable(observer => observer.next(this.primaryPatientSubject.value));
    }

    return this.http.get<any>(`${this.chatServiceUrl}/users/${userId}/patients/primary`).pipe(
      map(response => response.primaryPatientId || null),
      tap(patientId => {
        this.primaryPatientSubject.next(patientId);
        console.log('⭐ Primary patient:', patientId);
      }),
      catchError((error) => {
        console.warn('No primary patient found or error:', error);
        return new Observable(observer => observer.next(null));
      })
    );
  }

  /**
   * Check if user has access to a specific patient
   */
  hasAccessToPatient(patientId: string): Observable<boolean> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return new Observable(observer => observer.next(false));
    }

    return this.http.get<any>(
      `${this.chatServiceUrl}/users/${userId}/patients/${patientId}/access`
    ).pipe(
      map(response => response.hasAccess || false),
      catchError(() => new Observable(observer => observer.next(false)))
    );
  }

  /**
   * Add a new patient to the user's accessible patients
   */
  addPatientToUser(patientId: string, isPrimary = false): Observable<boolean> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return new Observable(observer => observer.next(false));
    }

    return this.http.post<any>(
      `${this.chatServiceUrl}/users/${userId}/patients`,
      { patientId, isPrimary }
    ).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          // Refresh patient list
          this.getUserPatients(true).subscribe();
          if (isPrimary) {
            this.primaryPatientSubject.next(patientId);
          }
          console.log('✅ Patient added:', patientId);
        }
      }),
      catchError((error) => {
        console.error('Failed to add patient:', error);
        return new Observable(observer => observer.next(false));
      })
    );
  }

  /**
   * Set a patient as primary for the user
   */
  setPrimaryPatient(patientId: string): Observable<boolean> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return new Observable(observer => observer.next(false));
    }

    return this.http.put<any>(
      `${this.chatServiceUrl}/users/${userId}/patients/${patientId}/primary`,
      {}
    ).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          this.primaryPatientSubject.next(patientId);
          console.log('⭐ Primary patient updated:', patientId);
        }
      }),
      catchError((error) => {
        console.error('Failed to set primary patient:', error);
        return new Observable(observer => observer.next(false));
      })
    );
  }

  /**
   * Remove a patient from user's accessible patients
   */
  removePatient(patientId: string): Observable<boolean> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return new Observable(observer => observer.next(false));
    }

    return this.http.delete<any>(
      `${this.chatServiceUrl}/users/${userId}/patients/${patientId}`
    ).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          // Refresh patient list
          this.getUserPatients(true).subscribe();
          // If removed patient was primary, clear it
          if (this.primaryPatientSubject.value === patientId) {
            this.primaryPatientSubject.next(null);
          }
          console.log('🗑️ Patient removed:', patientId);
        }
      }),
      catchError((error) => {
        console.error('Failed to remove patient:', error);
        return new Observable(observer => observer.next(false));
      })
    );
  }

  /**
   * Get current primary patient (synchronous)
   */
  getCurrentPrimaryPatient(): string | null {
    return this.primaryPatientSubject.value;
  }

  /**
   * Get current patient list (synchronous)
   */
  getCurrentPatients(): string[] {
    return this.patientsSubject.value;
  }

  /**
   * Initialize - load patients and primary patient
   */
  initialize(): void {
    this.getUserPatients(true).subscribe();
    this.getPrimaryPatient(true).subscribe();
  }

  /**
   * Clear cache (e.g., on logout)
   */
  clearCache(): void {
    this.patientsSubject.next([]);
    this.primaryPatientSubject.next(null);
  }
}
