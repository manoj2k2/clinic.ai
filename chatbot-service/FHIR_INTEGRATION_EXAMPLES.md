# FHIR Client Integration Examples for Chatbot

## Quick Start

The FHIR client is already integrated into the chatbot service and will automatically check connectivity on startup.

## Example Use Cases

### 1. Chatbot Records Patient Symptoms

When a patient reports symptoms during a chat session, the chatbot can create FHIR observations:

```typescript
// In your chatbot message handler (index.ts)
import { fhirClient } from "./services/fhir-client.service";

socket.on("message", async (data) => {
  // ... AI determines patient reported "headache" with severity "moderate"

  try {
    // Create symptom observation
    const observation = await fhirClient.createSymptomObservation(
      patientId,
      "Headache",
      "moderate",
      `Reported via chatbot at ${new Date().toISOString()}: ${data.content}`
    );

    console.log(`✅ Recorded symptom observation: ${observation.id}`);

    socket.emit("response", {
      message:
        "I've recorded your headache. How long have you been experiencing this symptom?",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to record symptom:", error);
    // Continue conversation even if FHIR recording fails
  }
});
```

### 2. Providing Context-Aware Responses

Before the AI responds, fetch relevant patient data to provide context:

```typescript
// Get patient's recent medical history
async function getPatientContext(patientId: string): Promise<string> {
  try {
    // Get patient demographics
    const patient = await fhirClient.getPatient(patientId);
    const patientName = `${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`;

    // Get recent observations
    const observations = await fhirClient.getPatientObservations(
      patientId,
      undefined,
      undefined,
      5
    );
    const recentFindings = observations
      .map(
        (obs) =>
          `${obs.code.text || obs.code.coding?.[0]?.display} (${
            obs.effectiveDateTime
          })`
      )
      .join(", ");

    // Get upcoming appointments
    const appointments = await fhirClient.getPatientAppointments(
      patientId,
      "booked",
      3
    );
    const upcomingAppts = appointments
      .filter((a) => new Date(a.start!) > new Date())
      .map((a) => `${a.start}: ${a.description || "Appointment"}`)
      .join(", ");

    return `Patient: ${patientName}
Recent findings: ${recentFindings || "None"}
Upcoming appointments: ${upcomingAppts || "None"}`;
  } catch (error) {
    console.error("Failed to fetch patient context:", error);
    return "Patient data not available";
  }
}

// Use in AI prompt
socket.on("message", async (data) => {
  const patientContext = await getPatientContext(patientId);

  const systemPrompt = `You are a medical assistant chatbot.
Patient Context:
${patientContext}

Provide helpful, empathetic responses based on the patient's history.`;

  const aiResult = await chatWithAI(data.content, history, systemPrompt);
  // ...
});
```

### 3. Screening Flow with FHIR Recording

Create a screening session that records all findings:

```typescript
interface ScreeningSession {
  sessionId: string;
  patientId: string;
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  observationIds: string[];
}

async function recordScreeningSymptom(
  session: ScreeningSession,
  symptom: string,
  severity: "mild" | "moderate" | "severe"
) {
  try {
    const observation = await fhirClient.createSymptomObservation(
      session.patientId,
      symptom,
      severity,
      `Screening session ${session.sessionId}`
    );

    session.observationIds.push(observation.id!);
    console.log(`✅ Recorded: ${symptom} (${severity})`);

    return observation;
  } catch (error) {
    console.error(`Failed to record ${symptom}:`, error);
    throw error;
  }
}

// Example screening flow
socket.on(
  "screening:symptom",
  async (data: { symptom: string; severity: string }) => {
    await recordScreeningSymptom(
      screeningSession,
      data.symptom,
      data.severity as "mild" | "moderate" | "severe"
    );

    socket.emit("screening:recorded", {
      message: `Recorded: ${data.symptom}`,
      symptomCount: screeningSession.symptoms.length,
    });
  }
);
```

### 4. Vital Signs Recording

If the chatbot collects vital signs (e.g., from a wearable or patient input):

```typescript
async function recordVitalSigns(
  patientId: string,
  vitals: {
    temperature?: number;
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    oxygenSaturation?: number;
  }
) {
  const observationIds: string[] = [];

  try {
    if (vitals.temperature) {
      const obs = await fhirClient.createVitalSignObservation(
        patientId,
        "8310-5", // Body temperature
        "Body Temperature",
        vitals.temperature,
        "degrees Celsius",
        "Cel"
      );
      observationIds.push(obs.id!);
    }

    if (vitals.heartRate) {
      const obs = await fhirClient.createVitalSignObservation(
        patientId,
        "8867-4", // Heart rate
        "Heart Rate",
        vitals.heartRate,
        "beats/min",
        "/min"
      );
      observationIds.push(obs.id!);
    }

    if (vitals.bloodPressureSystolic) {
      const obs = await fhirClient.createVitalSignObservation(
        patientId,
        "8480-6", // Systolic BP
        "Systolic Blood Pressure",
        vitals.bloodPressureSystolic,
        "mmHg",
        "mm[Hg]"
      );
      observationIds.push(obs.id!);
    }

    if (vitals.oxygenSaturation) {
      const obs = await fhirClient.createVitalSignObservation(
        patientId,
        "2708-6", // Oxygen saturation
        "Oxygen Saturation",
        vitals.oxygenSaturation,
        "%",
        "%"
      );
      observationIds.push(obs.id!);
    }

    console.log(`✅ Recorded ${observationIds.length} vital sign(s)`);
    return observationIds;
  } catch (error) {
    console.error("Failed to record vital signs:", error);
    throw error;
  }
}

// Usage in chatbot
socket.on("vitals:submit", async (data) => {
  try {
    const ids = await recordVitalSigns(patientId, data.vitals);

    socket.emit("vitals:recorded", {
      message: `Recorded ${ids.length} vital sign(s)`,
      observationIds: ids,
    });
  } catch (error) {
    socket.emit("error", {
      message: "Failed to record vital signs",
    });
  }
});
```

### 5. Error Handling Best Practices

Always handle FHIR errors gracefully:

```typescript
import {
  FhirError,
  FhirResourceNotFoundError,
  FhirNetworkError,
} from "./services/fhir-client.service";

async function safeFhirOperation(
  operation: () => Promise<any>,
  fallback?: any
) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof FhirNetworkError) {
      console.error("⚠️  FHIR server unreachable - continuing without FHIR");
      return fallback;
    } else if (error instanceof FhirResourceNotFoundError) {
      console.error("⚠️  Resource not found in FHIR");
      return fallback;
    } else if (error instanceof FhirError) {
      console.error("⚠️  FHIR error:", error.message);
      return fallback;
    } else {
      console.error("⚠️  Unexpected error:", error);
      return fallback;
    }
  }
}

// Usage
const patient = await safeFhirOperation(
  () => fhirClient.getPatient(patientId),
  null // Fallback if patient not found
);

if (!patient) {
  socket.emit("response", {
    message:
      "I don't have access to your medical records, but I'm here to help!",
  });
}
```

### 6. Appointment Reminders

Check for upcoming appointments and remind patients:

```typescript
async function checkUpcomingAppointments(patientId: string) {
  try {
    const appointments = await fhirClient.getPatientAppointments(
      patientId,
      "booked"
    );

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcoming = appointments.filter((appt) => {
      const apptDate = new Date(appt.start!);
      return apptDate > now && apptDate < tomorrow;
    });

    if (upcoming.length > 0) {
      const appt = upcoming[0];
      return {
        hasReminder: true,
        message: `📅 Reminder: You have an appointment tomorrow at ${new Date(
          appt.start!
        ).toLocaleTimeString()}. ${appt.description || ""}`,
      };
    }

    return { hasReminder: false };
  } catch (error) {
    console.error("Failed to check appointments:", error);
    return { hasReminder: false };
  }
}

// On connection, check for reminders
socket.on("connection", async () => {
  const reminder = await checkUpcomingAppointments(patientId);

  if (reminder.hasReminder) {
    socket.emit("reminder", {
      message: reminder.message,
    });
  }
});
```

## Integration Checklist

✅ FHIR client is initialized on startup
✅ Health check runs automatically
✅ Error handling is in place
✅ All FHIR operations are tested
✅ Service can run even if FHIR is unavailable

## Testing

Run the comprehensive test suite:

```bash
npx ts-node src/services/test-fhir-client.ts
```

## Environment Variables

Ensure these are set in your `.env`:

```env
FHIR_BASE_URL=http://localhost:8082/fhir
FHIR_VERSION=R4
FHIR_TIMEOUT_MS=10000
```

## Next Steps

1. ✅ FHIR client implemented
2. ✅ All operations tested
3. 🔄 Integrate into chatbot conversation flow
4. 🔄 Add AI function calling for FHIR operations
5. 🔄 Implement screening agent with FHIR recording
6. 🔄 Add appointment booking through FHIR

## See Also

- [FHIR_CLIENT_GUIDE.md](./FHIR_CLIENT_GUIDE.md) - Complete API documentation
- [AI_CHATBOT_IMPLEMENTATION_PLAN.md](../../AI_CHATBOT_IMPLEMENTATION_PLAN.md) - Overall implementation plan
