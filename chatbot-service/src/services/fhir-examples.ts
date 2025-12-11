/**
 * FHIR Client Quick Start Examples
 * 
 * Copy and paste these examples into your chatbot code
 */

import { fhirClient } from './services/fhir-client.service';

// ============================================================
// Example 1: Get Patient Demographics
// ============================================================
async function example1_getPatient() {
  try {
    const patient = await fhirClient.getPatient('1'); // Replace with actual patient ID
    
    console.log('Patient Information:');
    console.log(`  Name: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`);
    console.log(`  Gender: ${patient.gender}`);
    console.log(`  DOB: ${patient.birthDate}`);
    console.log(`  ID: ${patient.id}`);
    
    return patient;
  } catch (error) {
    console.error('Error fetching patient:', error);
  }
}

// ============================================================
// Example 2: Get Patient's Recent Observations
// ============================================================
async function example2_getObservations() {
  try {
    const observations = await fhirClient.getPatientObservations('1', undefined, undefined, 10);
    
    console.log(`Found ${observations.length} observations:`);
    observations.forEach((obs, index) => {
      const code = obs.code.text || obs.code.coding?.[0]?.display;
      const value = obs.valueQuantity 
        ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}`
        : obs.valueString || 'N/A';
      const date = new Date(obs.effectiveDateTime!).toLocaleString();
      
      console.log(`  ${index + 1}. ${code}: ${value} (${date})`);
    });
    
    return observations;
  } catch (error) {
    console.error('Error fetching observations:', error);
  }
}

// ============================================================
// Example 3: Record a Symptom (Most Common Use Case)
// ============================================================
async function example3_recordSymptom() {
  try {
    const observation = await fhirClient.createSymptomObservation(
      '1', // Patient ID
      'Headache', // Symptom name
      'moderate', // Severity: 'mild', 'moderate', or 'severe'
      'Patient reports persistent headache since this morning' // Optional note
    );
    
    console.log(`✅ Symptom recorded with ID: ${observation.id}`);
    return observation;
  } catch (error) {
    console.error('Error recording symptom:', error);
  }
}

// ============================================================
// Example 4: Record Vital Signs
// ============================================================
async function example4_recordVitals() {
  try {
    // Body temperature
    const temp = await fhirClient.createVitalSignObservation(
      '1', // Patient ID
      '8310-5', // LOINC code for body temperature
      'Body Temperature',
      37.5, // Value
      'degrees Celsius',
      'Cel' // Unit code
    );
    console.log(`✅ Temperature recorded: ${temp.id}`);
    
    // Heart rate
    const hr = await fhirClient.createVitalSignObservation(
      '1',
      '8867-4', // LOINC code for heart rate
      'Heart Rate',
      72,
      'beats/min',
      '/min'
    );
    console.log(`✅ Heart rate recorded: ${hr.id}`);
    
    return [temp, hr];
  } catch (error) {
    console.error('Error recording vitals:', error);
  }
}

// ============================================================
// Example 5: WebSocket Integration (Chatbot)
// ============================================================
function example5_websocketIntegration() {
  // Add this to your socket.on('message') handler in index.ts
  
  /*
  socket.on('message', async (data) => {
    try {
      // ... existing chatbot code ...
      
      // If AI detects a symptom in the message, record it:
      if (detectedSymptom) {
        await fhirClient.createSymptomObservation(
          patientId,
          detectedSymptom.name,
          detectedSymptom.severity,
          `Reported via chatbot: "${data.content}"`
        );
        console.log(`✅ Recorded symptom: ${detectedSymptom.name}`);
      }
      
      // Get patient context for AI
      const recentObs = await fhirClient.getPatientObservations(patientId, undefined, undefined, 5);
      const context = recentObs.map(o => o.code.text).join(', ');
      
      // Include in AI prompt
      const systemPrompt = `Patient's recent observations: ${context}`;
      
      // ... continue with AI response ...
      
    } catch (error) {
      console.error('FHIR operation failed:', error);
      // Continue chatbot flow even if FHIR fails
    }
  });
  */
}

// ============================================================
// Example 6: Comprehensive Patient Summary
// ============================================================
async function example6_patientSummary(patientId: string) {
  try {
    console.log('\n📊 Patient Summary');
    console.log('='.repeat(60));
    
    // Get patient
    const patient = await fhirClient.getPatient(patientId);
    console.log(`\n👤 Patient: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`);
    console.log(`   DOB: ${patient.birthDate} | Gender: ${patient.gender}`);
    
    // Get appointments
    const appointments = await fhirClient.getPatientAppointments(patientId);
    console.log(`\n📅 Appointments: ${appointments.length}`);
    appointments.slice(0, 3).forEach(apt => {
      console.log(`   - ${apt.status}: ${apt.start || 'Not scheduled'}`);
    });
    
    // Get vital signs
    const vitals = await fhirClient.getPatientObservations(patientId, 'vital-signs', undefined, 5);
    console.log(`\n💓 Recent Vital Signs: ${vitals.length}`);
    vitals.forEach(v => {
      const value = v.valueQuantity ? `${v.valueQuantity.value} ${v.valueQuantity.unit}` : 'N/A';
      console.log(`   - ${v.code.text || v.code.coding?.[0]?.display}: ${value}`);
    });
    
    // Get recent symptoms
    const symptoms = await fhirClient.getPatientObservations(patientId, 'survey', undefined, 5);
    console.log(`\n🤒 Recent Symptoms: ${symptoms.length}`);
    symptoms.forEach(s => {
      console.log(`   - ${s.code.text} (${s.effectiveDateTime})`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    return { patient, appointments, vitals, symptoms };
  } catch (error) {
    console.error('Error generating summary:', error);
  }
}

// ============================================================
// Example 7: Error Handling Best Practice
// ============================================================
async function example7_errorHandling(patientId: string) {
  try {
    const patient = await fhirClient.getPatient(patientId);
    return patient;
  } catch (error: any) {
    // Check error type
    if (error.name === 'FhirResourceNotFoundError') {
      console.log('Patient not found - maybe they are new?');
      return null;
    } else if (error.name === 'FhirNetworkError') {
      console.log('FHIR server is down - using cached data');
      return null;
    } else if (error.name === 'FhirValidationError') {
      console.log('Invalid data sent to FHIR:', error.message);
      return null;
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }
}

// ============================================================
// Example 8: Batch Symptom Recording (Screening Session)
// ============================================================
async function example8_screeningSession(patientId: string, symptoms: string[]) {
  const recordedIds: string[] = [];
  
  for (const symptom of symptoms) {
    try {
      const obs = await fhirClient.createSymptomObservation(
        patientId,
        symptom,
        'moderate', // You can make this dynamic based on severity
        'Recorded during screening session'
      );
      recordedIds.push(obs.id!);
      console.log(`✅ Recorded: ${symptom}`);
    } catch (error) {
      console.error(`❌ Failed to record ${symptom}:`, error);
      // Continue with other symptoms
    }
  }
  
  console.log(`\nScreening complete: ${recordedIds.length}/${symptoms.length} symptoms recorded`);
  return recordedIds;
}

// ============================================================
// RUN EXAMPLES
// ============================================================
async function runAllExamples() {
  console.log('🚀 FHIR Client Quick Start Examples\n');
  
  // Uncomment the examples you want to run:
  
  // await example1_getPatient();
  // await example2_getObservations();
  // await example3_recordSymptom();
  // await example4_recordVitals();
  // await example6_patientSummary('1');
  // await example8_screeningSession('1', ['Headache', 'Fever', 'Fatigue']);
}

// Uncomment to run:
// runAllExamples().catch(console.error);

export {
  example1_getPatient,
  example2_getObservations,
  example3_recordSymptom,
  example4_recordVitals,
  example6_patientSummary,
  example7_errorHandling,
  example8_screeningSession
};
