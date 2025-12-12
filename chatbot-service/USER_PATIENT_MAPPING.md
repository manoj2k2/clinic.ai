# 👥 User-Patient Mapping Feature

## Overview

The User-Patient Mapping feature allows IAM users (from Keycloak) to have access to one or more FHIR Patient resources. This is essential for scenarios where:

- A user manages their own health records (**self**)
- A parent manages children's records (**parent/child**)
- A caregiver manages patient records (**caregiver**)
- Family members share access (**spouse**, **sibling**, etc.)

---

## 🗄️ Database Schema

### Table: `user_patient_mapping`

```sql
CREATE TABLE user_patient_mapping (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,        -- Keycloak/IAM user ID
    patient_id VARCHAR(255) NOT NULL,     -- FHIR Patient resource ID
    is_primary BOOLEAN DEFAULT true,      -- Primary patient for this user
    relationship VARCHAR(100),            -- 'self', 'child', 'spouse', etc.
    access_level VARCHAR(50) DEFAULT 'full', -- 'full', 'read-only', 'limited'
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255),              -- Who granted access
    expires_at TIMESTAMP,                 -- Optional expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, patient_id)
);
```

### Key Features:

1. **Primary Patient**: Each user can have ONE primary patient (enforced by trigger)
2. **Relationship Tracking**: Optional relationship field
3. **Access Levels**: Support for different permission levels
4. **Expiration**: Optional expiration dates for temporary access
5. **Audit Trail**: Tracks who granted access and when

### Automatic Features:

- ✅ **Auto-Primary Enforcement**: Trigger ensures only one primary patient per user
- ✅ **Auto-Timestamps**: `updated_at` automatically updated on changes
- ✅ **Auto-Cleanup**: Periodic cleanup of expired mappings
- ✅ **Indexes**: Optimized for fast lookups
- ✅ **Views**: Pre-built views for common queries

---

## 📡 API Endpoints

### 1. Get User's Patients

```http
GET /api/users/:userId/patients
```

**Response:**

```json
{
  "success": true,
  "userId": "keycloak-user-123",
  "patientIds": ["patient-self-001", "patient-child-002", "patient-child-003"],
  "count": 3
}
```

**Use Case:** Load all patients for the logged-in user

---

### 2. Get Primary Patient

```http
GET /api/users/:userId/patients/primary
```

**Response:**

```json
{
  "success": true,
  "userId": "keycloak-user-123",
  "primaryPatientId": "patient-self-001"
}
```

**Use Case:** Default patient selection in UI

---

### 3. Check Access

```http
GET /api/users/:userId/patients/:patientId/access
```

**Response:**

```json
{
  "success": true,
  "userId": "keycloak-user-123",
  "patientId": "patient-001",
  "hasAccess": true
}
```

**Use Case:** Verify user can access specific patient before showing data

---

### 4. Add Patient to User

```http
POST /api/users/:userId/patients
Content-Type: application/json

{
  "patientId": "patient-child-001",
  "isPrimary": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Patient patient-child-001 added to user keycloak-user-123",
  "mapping": {
    "id": 1,
    "user_id": "keycloak-user-123",
    "patient_id": "patient-child-001",
    "is_primary": false,
    "created_at": "2025-12-12T12:00:00Z"
  }
}
```

**Use Case:** Onboarding, adding family members

---

### 5. Set Primary Patient

```http
PUT /api/users/:userId/patients/:patientId/primary
```

**Response:**

```json
{
  "success": true,
  "message": "Patient patient-child-001 set as primary for user keycloak-user-123"
}
```

**Use Case:** User switches between profiles

---

### 6. Remove Patient from User

```http
DELETE /api/users/:userId/patients/:patientId
```

**Response:**

```json
{
  "success": true,
  "message": "Patient patient-child-001 removed from user keycloak-user-123"
}
```

**Use Case:** Remove access when no longer needed

---

### 7. Get Users for Patient

```http
GET /api/patients/:patientId/users
```

**Response:**

```json
{
  "success": true,
  "patientId": "patient-001",
  "userIds": ["keycloak-user-parent", "keycloak-user-caregiver"],
  "count": 2
}
```

**Use Case:** Admin view - see who has access to a patient

---

## 🔐 Security Considerations

### Current Implementation:

- ✅ Input validation on all endpoints
- ✅ Consistent error responses
- ✅ SQL injection protection (parameterized queries)

### TODO (Phase 2):

- [ ] JWT authentication middleware
- [ ] User can only access their own mappings (userId from token)
- [ ] Role-based access (admin can see all mappings)
- [ ] Audit logging of all mapping changes
- [ ] Rate limiting on write operations

---

## 💡 Usage Examples

### Frontend Integration (Angular)

```typescript
// user-patient.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class UserPatientService {
  private baseUrl = "http://localhost:3001/api/users";

  constructor(private http: HttpClient) {}

  getUserPatients(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${userId}/patients`);
  }

  getPrimaryPatient(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${userId}/patients/primary`);
  }

  addPatient(
    userId: string,
    patientId: string,
    isPrimary = false
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/${userId}/patients`, {
      patientId,
      isPrimary,
    });
  }

  setPrimaryPatient(userId: string, patientId: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${userId}/patients/${patientId}/primary`,
      {}
    );
  }

  hasAccess(userId: string, patientId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/${userId}/patients/${patientId}/access`
    );
  }
}
```

### Component Usage

```typescript
// patient-selector.component.ts
export class PatientSelectorComponent implements OnInit {
  patients: string[] = [];
  primaryPatient: string;
  userId: string; // Get from Keycloak token

  constructor(private userPatientService: UserPatientService) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.userPatientService
      .getUserPatients(this.userId)
      .subscribe((response) => {
        this.patients = response.patientIds;
      });

    this.userPatientService
      .getPrimaryPatient(this.userId)
      .subscribe((response) => {
        this.primaryPatient = response.primaryPatientId;
      });
  }

  selectPatient(patientId: string) {
    this.userPatientService
      .setPrimaryPatient(this.userId, patientId)
      .subscribe(() => {
        this.primaryPatient = patientId;
        // Reload patient data in app
      });
  }
}
```

---

## 🧪 Testing with Swagger

1. **Open Swagger UI:**

   ```
   http://localhost:3001/api-docs
   ```

2. **Find "User-Patient Mapping" section**

3. **Try it out:**
   - Click "Try it out" on any endpoint
   - Fill in parameters (e.g., `userId: "test-user-001"`)
   - Click "Execute"
   - See response

---

## 🔄 Common Workflows

### Workflow 1: New User Onboarding

```
1. User signs up with Keycloak → userId = "keycloak-123"
2. Create FHIR Patient resource → patientId = "patient-001"
3. POST /api/users/keycloak-123/patients
   Body: { patientId: "patient-001", isPrimary: true }
4. User now has access to their patient record
```

### Workflow 2: Parent Adding Child

```
1. Parent logged in → userId = "parent-user"
2. Create child's FHIR Patient → childPatientId = "patient-child-001"
3. POST /api/users/parent-user/patients
   Body: {
     patientId: "patient-child-001",
     isPrimary: false
   }
4. Parent sees both their own and child's records
```

### Workflow 3: Switching Between Patients

```
1. GET /api/users/:userId/patients  → Get list
2. User selects different patient in UI
3. PUT /api/users/:userId/patients/:selectedPatientId/primary
4. UI reloads with selected patient's data
```

---

## 📊 Database Views

### Active Mappings View

```sql
SELECT * FROM active_user_patient_mappings;
-- Returns only non-expired mappings
```

### Primary Patients View

```sql
SELECT * FROM user_primary_patients;
-- Returns primary patient for each user
```

---

## 🚀 Next Steps

### Phase 1 (Complete ✅):

- [x] Database schema
- [x] Model methods
- [x] API routes
- [x] Swagger documentation

### Phase 2 (TODO):

- [ ] Add JWT authentication middleware
- [ ] Implement authorization (users can only access their own mappings)
- [ ] Add relationship types enum
- [ ] Add access level enforcement
- [ ] Create admin endpoints (manage any user's mappings)
- [ ] Add audit logging

### Phase 3 (Future):

- [ ] Temporary access with expiration
- [ ] Invitation system (share access via email)
- [ ] Granular permissions (what data can be accessed)
- [ ] Notification system (access granted/revoked)

---

## 📝 Notes

**File Locations:**

- Migration: `migrations/002_user_patient_mapping.sql`
- Model: `src/models/user-patient-mapping.model.ts`
- Routes: `src/routes/user-patient.routes.ts`
- Swagger: `src/config/swagger.config.ts` (updated)
- Main: `src/index.ts` (updated)

**Database:**

- Table created in `chatbot` database
- Connected to same PostgreSQL instance as conversations

**Testing:**

- All endpoints accessible via Swagger UI
- No authentication required yet (add in Phase 2)

---

**Your user-patient mapping feature is ready to use!** 🎉

Test it at: http://localhost:3001/api-docs
