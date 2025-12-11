# FHIR Client Service

## Overview

The FHIR Client Service provides a comprehensive interface to interact with the HAPI FHIR R4 server. It enables the chatbot to access patient data, appointments, observations, and create new resources.

## Features

✅ **Patient Operations**

- Get patient by ID with full demographics
- Graceful error handling for missing patients

✅ **Appointment Management**

- Fetch patient appointments
- Filter by status
- Sort by date (most recent first)

✅ **Observation Management**

- Retrieve patient observations
- Filter by category (vital-signs, laboratory, survey, etc.)
- Filter by LOINC/SNOMED codes
- Create new observations
- Helper methods for common observation types

✅ **Error Handling**

- Custom error classes for different scenarios
- Network error detection
- FHIR OperationOutcome parsing
- Validation error reporting

## Installation

The FHIR client is automatically initialized when the chatbot service starts. Dependencies are already included:

```bash
npm install axios @types/axios
```

## Configuration

Configure the FHIR server connection in your `.env` file:

```env
# FHIR Server Configuration
FHIR_BASE_URL=http://localhost:8082/fhir
FHIR_VERSION=R4
FHIR_TIMEOUT_MS=10000
```

## Usage

### Import the Client

```typescript
import { fhirClient } from "./services/fhir-client.service";
```

### Get Patient by ID

```typescript
try {
  const patient = await fhirClient.getPatient("patient-123");
  console.log(
    `Patient: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`
  );
  console.log(`Gender: ${patient.gender}`);
  console.log(`Birth Date: ${patient.birthDate}`);
} catch (error) {
  if (error instanceof FhirResourceNotFoundError) {
    console.error("Patient not found");
  } else if (error instanceof FhirNetworkError) {
    console.error("Cannot reach FHIR server");
  } else {
    console.error("FHIR error:", error.message);
  }
}
```

### Get Patient Appointments

```typescript
// Get all appointments
const appointments = await fhirClient.getPatientAppointments("patient-123");

// Get only booked appointments
const bookedAppts = await fhirClient.getPatientAppointments(
  "patient-123",
  "booked"
);

// Limit results
const recentAppts = await fhirClient.getPatientAppointments(
  "patient-123",
  undefined,
  10
);

appointments.forEach((appt) => {
  console.log(`${appt.status}: ${appt.start} - ${appt.description}`);
});
```

### Get Patient Observations

```typescript
// Get all observations
const observations = await fhirClient.getPatientObservations("patient-123");

// Get vital signs only
const vitals = await fhirClient.getPatientObservations(
  "patient-123",
  "vital-signs"
);

// Get specific observation type (e.g., body temperature)
const temps = await fhirClient.getPatientObservations(
  "patient-123",
  undefined,
  "8310-5"
);

observations.forEach((obs) => {
  console.log(
    `${obs.code.text}: ${obs.valueQuantity?.value} ${obs.valueQuantity?.unit}`
  );
});
```

### Create Observations

#### Simple Symptom Observation (Recommended)

```typescript
const observation = await fhirClient.createSymptomObservation(
  "patient-123",
  "Headache",
  "moderate", // Optional: 'mild', 'moderate', 'severe'
  "Patient reports headache since morning" // Optional note
);
```

#### Vital Sign Observation

```typescript
// Body temperature
const temp = await fhirClient.createVitalSignObservation(
  "patient-123",
  "8310-5", // LOINC code for body temperature
  "Body Temperature",
  38.5,
  "degrees Celsius",
  "Cel"
);

// Blood pressure (systolic)
const bp = await fhirClient.createVitalSignObservation(
  "patient-123",
  "8480-6", // LOINC code for systolic BP
  "Systolic Blood Pressure",
  120,
  "mmHg",
  "mm[Hg]"
);
```

#### Custom Observation

```typescript
const observation = await fhirClient.createObservation({
  resourceType: "Observation",
  status: "final",
  category: [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "survey",
          display: "Survey",
        },
      ],
    },
  ],
  code: {
    coding: [
      {
        system: "http://snomed.info/sct",
        code: "418799008",
        display: "Symptom",
      },
    ],
    text: "Cough",
  },
  subject: {
    reference: `Patient/patient-123`,
    display: "John Doe",
  },
  effectiveDateTime: new Date().toISOString(),
  valueCodeableConcept: {
    coding: [
      {
        system: "http://snomed.info/sct",
        code: "24484000",
        display: "Severe",
      },
    ],
    text: "Severe",
  },
  note: [
    {
      text: "Dry cough, worse at night",
    },
  ],
});
```

## Error Handling

The FHIR client provides specific error types for different scenarios:

```typescript
import {
  FhirError,
  FhirResourceNotFoundError,
  FhirValidationError,
  FhirNetworkError,
} from "./services/fhir-client.service";

try {
  const patient = await fhirClient.getPatient("patient-123");
} catch (error) {
  if (error instanceof FhirResourceNotFoundError) {
    // Handle 404 - Resource not found
    console.error("Resource not found");
  } else if (error instanceof FhirValidationError) {
    // Handle 400/422 - Validation error
    console.error("Invalid data:", error.operationOutcome);
  } else if (error instanceof FhirNetworkError) {
    // Handle network/connection errors
    console.error("Cannot reach FHIR server");
  } else if (error instanceof FhirError) {
    // Handle other FHIR errors
    console.error("FHIR error:", error.statusCode, error.message);
  }
}
```

## Health Check

Test FHIR server connectivity:

```typescript
const isHealthy = await fhirClient.healthCheck();
if (isHealthy) {
  console.log("FHIR server is running");

  const capabilities = await fhirClient.getCapabilities();
  console.log("Server version:", capabilities.fhirVersion);
}
```

## Testing

Run the comprehensive test suite to verify all FHIR operations:

```bash
npx ts-node src/services/test-fhir-client.ts
```

The test suite covers:

1. ✅ FHIR Server Health Check
2. ✅ Get Patient by ID
3. ✅ Error Handling - Non-Existent Patient
4. ✅ Get Patient Appointments
5. ✅ Get Patient Observations
6. ✅ Create Simple Observation
7. ✅ Create Symptom Observation (Helper)
8. ✅ Create Vital Sign Observation
9. ✅ Validation Error Handling

## Common LOINC Codes for Vital Signs

Use these codes when creating vital sign observations:

| Code    | Display                  | Unit        |
| ------- | ------------------------ | ----------- |
| 8310-5  | Body Temperature         | °C or °F    |
| 8480-6  | Systolic Blood Pressure  | mmHg        |
| 8462-4  | Diastolic Blood Pressure | mmHg        |
| 8867-4  | Heart Rate               | beats/min   |
| 9279-1  | Respiratory Rate         | breaths/min |
| 2708-6  | Oxygen Saturation        | %           |
| 29463-7 | Body Weight              | kg or lb    |
| 8302-2  | Body Height              | cm or in    |
| 39156-5 | Body Mass Index          | kg/m²       |

## Common SNOMED Codes for Symptoms

| Code      | Display           |
| --------- | ----------------- |
| 418799008 | Symptom (general) |
| 25064002  | Headache          |
| 386661006 | Fever             |
| 49727002  | Cough             |
| 162397003 | Pain              |
| 62315008  | Diarrhea          |
| 422587007 | Nausea            |
| 422400008 | Vomiting          |
| 271807003 | Fatigue           |

## Integration with Chatbot

Example chatbot use cases:

### Scenario 1: Patient Symptom Reporting

```typescript
// User: "I have a headache"
socket.on("message", async (data) => {
  // ... AI determines symptom is "headache" with severity "moderate"

  try {
    await fhirClient.createSymptomObservation(
      patientId,
      "Headache",
      "moderate",
      `Reported via chatbot: ${data.content}`
    );

    socket.emit("response", {
      message: "I've recorded your headache. How long have you had it?",
    });
  } catch (error) {
    console.error("Failed to record symptom:", error);
  }
});
```

### Scenario 2: Reviewing Patient History

```typescript
// Get patient's recent observations before responding
const observations = await fhirClient.getPatientObservations(
  patientId,
  undefined,
  undefined,
  10
);
const recentSymptoms = observations
  .filter((obs) => obs.category?.[0]?.coding?.[0]?.code === "survey")
  .map((obs) => obs.code.text);

const context = `Patient has recently reported: ${recentSymptoms.join(", ")}`;
// Include this context in the AI prompt
```

### Scenario 3: Appointment Reminders

```typescript
const appointments = await fhirClient.getPatientAppointments(
  patientId,
  "booked"
);
const upcoming = appointments.filter(
  (appt) => new Date(appt.start!) > new Date()
);

if (upcoming.length > 0) {
  socket.emit("response", {
    message: `You have ${upcoming.length} upcoming appointment(s).`,
  });
}
```

## Troubleshooting

### Cannot Connect to FHIR Server

```
❌ FHIR server not reachable - patient data features may not work
```

**Solution**: Ensure HAPI FHIR server is running:

```bash
docker-compose up -d hapi-fhir
# Or check if server is running at http://localhost:8082/fhir
```

### Patient Not Found

```typescript
// Always verify patient exists before creating observations
try {
  const patient = await fhirClient.getPatient(patientId);
  // Patient exists, proceed
} catch (error) {
  if (error instanceof FhirResourceNotFoundError) {
    // Handle - maybe this is a new patient
    console.log("Patient not found in FHIR system");
  }
}
```

### Validation Errors

Common validation issues:

- Missing required `subject.reference`
- Missing required `code`
- Invalid status values
- Malformed resource structure

The client validates basic fields before sending, but HAPI may return additional validation errors.

## Best Practices

1. **Always handle errors**: Network issues, missing resources, and validation errors are common
2. **Use helper methods**: `createSymptomObservation()` and `createVitalSignObservation()` handle most cases
3. **Include notes**: Add context to observations so clinicians understand the source
4. **Check connectivity**: Use `healthCheck()` before critical operations
5. **Limit queries**: Use the `count` parameter to avoid overwhelming responses
6. **Use standard codes**: Prefer LOINC for observations, SNOMED for clinical findings

## API Reference

See the [FHIR R4 specification](https://www.hl7.org/fhir/R4/) for complete resource documentation:

- [Patient Resource](https://www.hl7.org/fhir/R4/patient.html)
- [Appointment Resource](https://www.hl7.org/fhir/R4/appointment.html)
- [Observation Resource](https://www.hl7.org/fhir/R4/observation.html)
- [LOINC Codes](https://loinc.org/)
- [SNOMED CT](https://www.snomed.org/)
