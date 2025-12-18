# Option C - User-Patient Mapping Table Implementation

## Overview
Implemented a database-backed user-patient mapping approach where the relationship between IAM users and FHIR patients is stored in the `chatbot-service` database (`chatdb`). This provides flexibility, audit trail, and multi-patient family member support without requiring Keycloak changes.

## Architecture

```
┌─────────────────────┐
│   Frontend (4200)   │
│  AuthService        │
│  - getAvailablePatientIds() → Async fetch from backend
│  - getPrimaryPatientObservable() → Async fetch from backend
│  - addPatientMapping() → Post to backend on patient creation
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────────────┐
│   Chatbot Service Backend (3001)            │
│  /api/users/:userId/patients                │
│  /api/users/:userId/patients/primary        │
│  /api/users/:userId/patients/:patientId/... │
└──────────┬──────────────────────────────────┘
           │
           ↓
┌─────────────────────┐
│   PostgreSQL chatdb │
│  user_patient_      │
│  mapping TABLE      │
└─────────────────────┘
```

## Database Schema

**Table**: `user_patient_mapping`

```sql
CREATE TABLE user_patient_mapping (
  id SERIAL PRIMARY KEY,
  iam_user_id VARCHAR(255) NOT NULL,      -- Keycloak user ID (sub)
  fhir_patient_id VARCHAR(255) NOT NULL,  -- FHIR Patient.id
  is_primary BOOLEAN DEFAULT true,        -- Primary patient for user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(iam_user_id, fhir_patient_id),
  INDEX idx_user_patient_mapping_user (iam_user_id),
  INDEX idx_user_patient_mapping_patient (fhir_patient_id)
);
```

## Backend Components

### 1. Model: UserPatientMappingModel
**File**: `chatbot-service/src/models/user-patient-mapping.model.ts`

Methods:
- `addPatientToUser()` - Add/upsert patient mapping
- `getPatientsByUser()` - Get all patients for a user
- `getPrimaryPatient()` - Get user's primary patient
- `setPrimaryPatient()` - Set primary patient
- `removePatientFromUser()` - Remove mapping
- `hasAccessToPatient()` - Check access
- `getUsersForPatient()` - Get all users for a patient

### 2. API Endpoints
**File**: `chatbot-service/src/index.ts`

Endpoints added to Express app:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/patients` | Get all accessible patients |
| GET | `/api/users/:userId/patients/primary` | Get primary patient |
| POST | `/api/users/:userId/patients` | Add patient mapping |
| PUT | `/api/users/:userId/patients/:patientId/primary` | Set as primary |
| GET | `/api/users/:userId/patients/:patientId/access` | Check access |
| DELETE | `/api/users/:userId/patients/:patientId` | Remove mapping |

## Frontend Components

### 1. AuthService Updates
**File**: `FE/src/app/services/auth.service.ts`

Methods:
- `getUserId()` - Get IAM user ID from token
- `getAvailablePatientIds()` - Observable that fetches from backend
- `getPatientId()` - Returns cached primary patient
- `getPrimaryPatientObservable()` - Observable for async fetch
- `setActivePatientId()` - Switch patient (calls backend)
- `addPatientMapping()` - Register new patient (called on creation)

### 2. ChatbotComponent
**File**: `FE/src/app/chatbot/chatbot.component.ts`

Enhanced with:
- `availablePatients[]` - List of accessible patients
- `selectedPatientId` - Currently active patient
- `switchPatient()` - Handle patient switching
- Loads patients on init via `getAvailablePatientIds()`
- Connects with primary patient via `getPrimaryPatientObservable()`

### 3. PatientEditorComponent
**File**: `FE/src/app/patient/patient-editor.component.ts`

Updated `save()` method:
- After FHIR patient creation, calls `auth.addPatientMapping()`
- Creates mapping in database
- Graceful error handling if mapping fails

## Data Flow

### Patient Registration
```
1. User submits form in PatientEditor
   ↓
2. FhirService.createPatient(patient) → FHIR server
   ↓
3. Response contains new Patient.id
   ↓
4. AuthService.addPatientMapping(patientId) 
   ↓
5. Backend POST /api/users/:userId/patients
   ↓
6. UserPatientMappingModel inserts row into DB
   ↓
7. User's patient list updated on next fetch
```

### Patient Access
```
1. User logs in
   ↓
2. Chatbot component loads
   ↓
3. auth.getAvailablePatientIds() → Backend fetch
   ↓
4. Backend query user_patient_mapping table
   ↓
5. Returns all accessible patient IDs
   ↓
6. auth.getPrimaryPatientObservable() → Fetch primary
   ↓
7. Connect to chatbot with that patient context
```

### Patient Switching
```
1. User selects different patient from dropdown
   ↓
2. switchPatient(newPatientId) called
   ↓
3. auth.setActivePatientId(newPatientId) → Backend update
   ↓
4. Backend PUT /api/users/:userId/patients/:patientId/primary
   ↓
5. UserPatientMappingModel updates is_primary flag
   ↓
6. Disconnect old socket, reconnect with new patient
   ↓
7. Clear messages, load new patient context
```

## Benefits of Option C

✅ **No Keycloak Configuration** - Works with vanilla Keycloak setup  
✅ **Full Audit Trail** - All mappings logged in database  
✅ **Easy Changes** - Can modify mappings without token refresh  
✅ **Multi-tenant Ready** - Supports family members, shared access  
✅ **Conditional Access** - Can implement complex rules (time-based, role-based)  
✅ **Backend Control** - Security enforcement at API layer  
✅ **Backwards Compatible** - Can coexist with other user data  

## Database Migration

To apply the schema:

```bash
# Using CLI
psql -h localhost -U chatuser -d chatdb -f infra/migrations/001_create_user_patient_mapping.sql

# Or via Docker
docker exec -it postgres_chatdb psql -U chatuser -d chatdb < infra/migrations/001_create_user_patient_mapping.sql
```

## Error Handling

- **User not authenticated** - Returns 400 (bad request)
- **Patient not found** - Returns 404 (not found)
- **Access denied** - Returns 403 (forbidden)
- **DB errors** - Returns 500 with error message
- **Patient creation fails but mapping succeeds** - Log warning, continue
- **Mapping fails but patient created** - Log warning, user can manually sync

## Testing Flow

1. **Create Patient**
   ```
   Navigate to /patients → Create patient → Verify mapping added to DB
   SELECT * FROM user_patient_mapping WHERE iam_user_id = 'user-uuid'
   ```

2. **View Available Patients**
   ```
   curl http://localhost:3001/api/users/{userId}/patients
   ```

3. **Switch Patients**
   ```
   Chatbot → Patient dropdown → Select different patient → Verify reconnection
   ```

4. **Check Primary**
   ```
   curl http://localhost:3001/api/users/{userId}/patients/primary
   ```

## Future Enhancements

- Consent-based access (tie to FHIR Consent resource)
- Role-based patient access (doctor vs. patient)
- Time-limited access
- Delegation workflows
- Activity logging and audit report
- Batch import of patient mappings from CSV
