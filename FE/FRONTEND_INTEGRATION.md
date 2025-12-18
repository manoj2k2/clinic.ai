# 🎨 Frontend User-Patient Mapping Integration

## Overview

This document explains the User-Patient Mapping feature implementation in the Angular frontend chatbot component, following the backend API documented in `USER_PATIENT_MAPPING.md`.

---

## 📁 Files Created/Modified

### ✅ Created Files:

1. **`src/app/services/user-patient.service.ts`** - New service for user-patient management
2. **`FRONTEND_INTEGRATION.md`** - This documentation

### ✅ Modified Files:

1. **`src/app/chatbot/chatbot.component.ts`** - Enhanced with patient management
2. **`src/app/chatbot/chatbot.component.html`** - Added patient selector UI
3. **`src/app/chatbot/chatbot.component.css`** - Styled patient selector and improvements

### ℹ️ Existing (Used):

1. **`src/app/services/auth.service.ts`** - Already has user-patient mapping methods

---

## 🎯 Features Implemented

### 1. **Patient Selector Dropdown** 👥

- View all accessible patients for logged-in user
- Visual indicator for primary patient (⭐)
- Click to switch between patients
- Smooth animations and transitions

### 2. **Real-time Patient Switching** 🔄

- Switch patients without page reload
- Automatic chat reconnection with new patient context
- Clear chat history when switching
- Update primary patient in backend

### 3. **Access Control** 🔐

- Verify user has access before switching
- Graceful error handling
- User-friendly error messages

### 4. **Reactive State Management** 📊

- Uses RxJS BehaviorSubject for real-time updates
- Automatic refresh on patient changes
- Subscribe to patient list changes

### 5. **Enhanced UX** ✨

- Loading states while fetching patients
- Quick action buttons for common tasks
- Conversation history loading
- Clear chat option
- System messages for feedback

---

## 🔧 Service Architecture

### **UserPatientService**

New dedicated service with reactive state management:

```typescript
export class UserPatientService {
  // Observable streams
  public patients$: Observable<string[]>;
  public primaryPatient$: Observable<string | null>;

  // Methods
  getUserPatients(forceRefresh?: boolean): Observable<string[]>;
  getPrimaryPatient(forceRefresh?: boolean): Observable<string | null>;
  hasAccessToPatient(patientId: string): Observable<boolean>;
  addPatientToUser(patientId: string, isPrimary?: boolean): Observable<boolean>;
  setPrimaryPatient(patientId: string): Observable<boolean>;
  removePatient(patientId: string): Observable<boolean>;
  initialize(): void;
  clearCache(): void;
}
```

**Key Features:**

- ✅ BehaviorSubject for state management
- ✅ Automatic caching with force refresh option
- ✅ Observable streams for reactive updates
- ✅ Error handling with fallbacks

---

## 📡 API Integration

### Backend Endpoints Used:

| Endpoint                                         | HTTP Method | Purpose                   |
| ------------------------------------------------ | ----------- | ------------------------- |
| `/api/users/:userId/patients`                    | GET         | Get all patients for user |
| `/api/users/:userId/patients/primary`            | GET         | Get primary patient       |
| `/api/users/:userId/patients/:patientId/access`  | GET         | Check access              |
| `/api/users/:userId/patients/:patientId/primary` | PUT         | Set primary patient       |
| `/api/users/:userId/patients`                    | POST        | Add patient to user       |
| `/api/users/:userId/patients/:patientId`         | DELETE      | Remove patient            |

---

## 🎨 UI Components

### **Header with Patient Selector:**

```html
<div class="patient-selector">
  <div class="current-patient" (click)="togglePatientSelector()">
    <span>👤</span>
    <span>{{ getCurrentPatientName() }}</span>
    <span class="dropdown-arrow">▼</span>
  </div>

  <div class="patient-dropdown" *ngIf="showPatientSelector">
    <div
      *ngFor="let patient of availablePatients"
      (click)="switchPatient(patient.id)"
    >
      {{ patient.label }}
    </div>
  </div>
</div>
```

### **Quick Action Buttons:**

```html
<button (click)="messageInput = 'I need help with symptoms'; sendMessage()">
  💊 Report Symptoms
</button>
<button (click)="messageInput = 'I want to book an appointment'; sendMessage()">
  📅 Book Appointment
</button>
```

---

## 🔄 Component Workflow

### **Initialization Flow:**

```
1. Component ngOnInit()
   ↓
2. userPatientService.initialize()
   ↓
3. Load patients from backend
   ↓
4. Subscribe to patients$ observable
   ↓
5. Subscribe to primaryPatient$ observable
   ↓
6. When primary patient set → initializeConnection()
   ↓
7. Connect WebSocket with patientId
   ↓
8. Ready to chat
```

### **Patient Switching Flow:**

```
User clicks patient in dropdown
   ↓
Check if user has access (hasAccessToPatient)
   ↓
Set as primary patient (setPrimaryPatient)
   ↓
Update selectedPatientId
   ↓
Disconnect current WebSocket
   ↓
Clear messages
   ↓
Create new session
   ↓
initializeConnection() with new patientId
   ↓
User can chat with new patient context
```

---

## 💡 Usage Examples

### **Subscribing to Patient Changes:**

```typescript
// In component
this.userPatientService.patients$
  .pipe(takeUntil(this.destroy$))
  .subscribe((patientIds) => {
    console.log("Patients updated:", patientIds);
    this.updatePatientOptions(patientIds);
  });
```

### **Switching Patients:**

```typescript
switchPatient(patientId: string) {
  this.userPatientService.hasAccessToPatient(patientId)
    .subscribe(hasAccess => {
      if (hasAccess) {
        this.userPatientService.setPrimaryPatient(patientId)
          .subscribe(success => {
            if (success) {
              // React to change in subscriber
            }
          });
      }
    });
}
```

### **Adding New Patient:**

```typescript
// After creating FHIR Patient resource
this.userPatientService
  .addPatientToUser(newPatientId, true)
  .subscribe((success) => {
    if (success) {
      console.log("Patient added and set as primary");
    }
  });
```

---

## 🎯 State Management

### **Component State:**

```typescript
// Patient management
selectedPatientId: string | null = null;        // Currently active patient
availablePatients: PatientOption[] = [];        // All accessible patients
isLoadingPatients: boolean = true;              // Loading state
showPatientSelector: boolean = false;           // Dropdown visibility

// Chat state
messages: Message[] = [];                       // Chat messages
isConnected: boolean = false;                   // WebSocket status
socket?: Socket;                                // WebSocket connection
```

### **Service State (Reactive):**

```typescript
// BehaviorSubjects (internal)
private patientsSubject = new BehaviorSubject<string[]>([]);
private primaryPatientSubject = new BehaviorSubject<string | null>(null);

// Observables (public)
public patients$ = this.patientsSubject.asObservable();
public primaryPatient$ = this.primaryPatientSubject.asObservable();
```

---

## 🚀 Advanced Features

### **1. Conversation History Loading**

```typescript
loadHistory() {
  if (this.socket && this.isConnected) {
    this.socket.emit('getHistory');
  }
}

// Response handler
this.socket.on('history', (data) => {
  if (data.success && data.messages) {
    this.loadHistoryMessages(data.messages);
  }
});
```

### **2. System Messages**

```typescript
private addSystemMessage(content: string) {
  this.addMessage(content, 'system', new Date());
}

// Usage
this.addSystemMessage('Switched to Patient XYZ');
this.addSystemMessage('⚠️ Connection lost. Retrying...');
```

### **3. Keyboard Shortcuts**

```typescript
onKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    this.sendMessage();
  }
}
```

---

## 🎨 Styling Highlights

### **Patient Selector Styles:**

```css
.patient-selector {
  position: relative;
  max-width: 350px;
}

.current-patient {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  cursor: pointer;
}

.patient-dropdown {
  position: absolute;
  top: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: dropdown 0.2s ease-out;
}
```

### **Message Type Styles:**

```css
.message.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message.assistant .message-bubble {
  background: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.message.system .message-bubble {
  background: #fff3cd;
  color: #856404;
  text-align: center;
}
```

---

## 🔍 Debugging Tips

### **Check Patient Loading:**

```javascript
// Open browser console
console.log("Patients:", this.availablePatients);
console.log("Selected:", this.selectedPatientId);
console.log("Primary:", this.userPatientService.getCurrentPrimaryPatient());
```

### **Monitor API Calls:**

```javascript
// Network tab in DevTools
// Look for:
GET http://localhost:3001/api/users/{userId}/patients
GET http://localhost:3001/api/users/{userId}/patients/primary
PUT http://localhost:3001/api/users/{userId}/patients/{patientId}/primary
```

### **WebSocket Debugging:**

```javascript
// Check connection
console.log("Socket connected:", this.socket?.connected);
console.log("Session ID:", this.sessionId);
console.log("Patient ID:", this.selectedPatientId);
```

---

## ⚠️ Common Issues & Solutions

### **Issue 1: Patient List Not Loading**

**Symptoms:**

- Empty patient selector
- "Loading patients..." stuck

**Solutions:**

1. Check backend chatbot service is running on port 3001
2. Verify user is authenticated (has userId)
3. Check browser console for API errors
4. Verify database has user-patient mappings

```typescript
// Debug in component
ngOnInit() {
  const userId = this.auth.getUserId();
  console.log('User ID:', userId); // Should not be null
}
```

### **Issue 2: Cannot Switch Patients**

**Symptoms:**

- Clicking patient does nothing
- Error message appears

**Solutions:**

1. Check `hasAccessToPatient` API response
2. Verify patient exists in database
3. Check WebSocket disconnects properly

```typescript
// Add logging
switchPatient(patientId: string) {
  console.log('Switching to:', patientId);
  this.userPatientService.hasAccessToPatient(patientId)
    .subscribe(hasAccess => {
      console.log('Has access:', hasAccess);
      // ...
    });
}
```

### **Issue 3: Chat Not Reconnecting**

**Symptoms:**

- After switching, chat shows disconnected
- Cannot send messages

**Solutions:**

1. Check `initializeConnection()` is called
2. Verify new sessionId is generated
3. Check backend receives new patientId

```typescript
// Debug in initializeConnection()
initializeConnection() {
  console.log('Connecting with:', {
    sessionId: this.sessionId,
    patientId: this.selectedPatientId
  });
  // ...
}
```

---

## 📊 Testing Checklist

### **Manual Testing:**

- [ ] Login as user
- [ ] Patient selector shows at least one patient
- [ ] Primary patient has ⭐ indicator
- [ ] Click patient selector opens dropdown
- [ ] Click different patient switches successfully
- [ ] Chat reconnects with new patient
- [ ] Previous messages cleared
- [ ] System message confirms switch
- [ ] Send message works after switch
- [ ] Quick action buttons work
- [ ] Load history button works
- [ ] Clear chat button works
- [ ] Patient name displays correctly
- [ ] Dropdown closes after selection
- [ ] WebSocket status updates correctly

### **Edge Cases:**

- [ ] User with only one patient (no dropdown arrow)
- [ ] User with no patients (error message)
- [ ] Switch to same patient (no action)
- [ ] Network error during switch (error handling)
- [ ] Backend offline (graceful degradation)
- [ ] Invalid patientId (access denied)

---

## 🚀 Next Steps

### **Phase 1 (Complete):** ✅

- [x] UserPatientService created
- [x] Chatbot component enhanced
- [x] Patient selector UI
- [x] Patient switching functionality
- [x] Access control
- [x] Reactive state management

### **Phase 2 (Recommendations):**

- [ ] Fetch actual patient names from FHIR
- [ ] Add patient avatars
- [ ] Show relationship labels (self, child, etc.)
- [ ] Add patient search/filter
- [ ] Persist conversation history per patient
- [ ] Add patient details modal
- [ ] Show access level badges

### **Phase 3 (Advanced):**

- [ ] Add patient invitation flow
- [ ] Temporary access management
- [ ] Notification when new patient added
- [ ] Patient onboarding wizard
- [ ] Multiple patient chat comparison
- [ ] Export conversation history per patient

---

## 📚 Related Documentation

- **Backend API**: `chatbot-service/USER_PATIENT_MAPPING.md`
- **Refactoring**: `chatbot-service/REFACTORING_SUMMARY.md`
- **Backend Setup**: `chatbot-service/README.md`
- **Quick Start**: `chatbot-service/24_HOUR_QUICKSTART.md`

---

## ✅ Summary

The User-Patient Mapping feature is now fully integrated into the chatbot component with:

✨ **Professional UI** with dropdown selector  
🔄 **Seamless patient switching** without page reload  
🔐 **Access control** verification  
📊 **Reactive state management** with RxJS  
💬 **Enhanced UX** with quick actions and system messages  
🎨 **Beautiful design** with smooth animations  
📱 **Responsive** mobile-friendly layout

**Your chatbot now supports multi-patient management!** 🎉

---

**Test it now:**

1. Start backend: `cd chatbot-service && npm run dev`
2. Start frontend: `cd FE && npm run start`
3. Open http://localhost:4200
4. Navigate to chatbot page
5. See patient selector in header
6. Switch between patients!
