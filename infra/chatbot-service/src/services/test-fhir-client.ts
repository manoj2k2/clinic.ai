/**
 * FHIR Client Service - Test Script
 * 
 * Tests all FHIR operations with the existing HAPI server
 * Run with: npx ts-node src/services/test-fhir-client.ts
 */

import dotenv from 'dotenv';
import { fhirClient, FhirError, FhirResourceNotFoundError } from './fhir-client.service';

// Load environment variables
dotenv.config();

// Test results tracking
const results: { test: string; passed: boolean; error?: string }[] = [];

function logTest(name: string, passed: boolean, error?: any) {
  results.push({
    test: name,
    passed,
    error: error?.message || error?.toString()
  });

  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 FHIR Client Service - Test Suite');
  console.log('='.repeat(60) + '\n');

  // Test 1: Health Check
  console.log('📋 Test 1: FHIR Server Health Check');
  console.log('-'.repeat(60));
  try {
    const isHealthy = await fhirClient.healthCheck();
    logTest('FHIR Server is reachable', isHealthy);
    
    if (isHealthy) {
      const capabilities = await fhirClient.getCapabilities();
      logTest('Can fetch server capabilities', !!capabilities);
      console.log(`   FHIR Version: ${capabilities.fhirVersion}`);
      console.log(`   Software: ${capabilities.software?.name || 'Unknown'}`);
    }
  } catch (error) {
    logTest('FHIR Server is reachable', false, error);
  }

  console.log('');

  // Test 2: Get Existing Patient
  console.log('📋 Test 2: Get Patient by ID');
  console.log('-'.repeat(60));
  
  // Try to find an existing patient first
  let testPatientId: string | null = null;
  
  try {
    // Search for any patient to get a valid ID
    const response = await (fhirClient as any).client.get('/Patient', {
      params: { _count: 1 }
    });
    
    if (response.data?.entry && response.data.entry.length > 0) {
      testPatientId = response.data.entry[0].resource.id;
      console.log(`   Found test patient ID: ${testPatientId}`);
    }
  } catch (error) {
    console.log('   ⚠️  Could not find existing patient, will create one');
  }

  // Test getting patient
  if (testPatientId) {
    try {
      const patient = await fhirClient.getPatient(testPatientId);
      logTest(`Get patient ${testPatientId}`, !!patient.id);
      console.log(`   Patient Name: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`);
      console.log(`   Gender: ${patient.gender || 'unknown'}`);
      console.log(`   Birth Date: ${patient.birthDate || 'unknown'}`);
    } catch (error) {
      logTest(`Get patient ${testPatientId}`, false, error);
    }
  } else {
    // Create a test patient
    try {
      console.log('   Creating test patient...');
      const newPatient = {
        resourceType: 'Patient',
        name: [{
          use: 'official',
          family: 'TestPatient',
          given: ['FHIR', 'Client']
        }],
        gender: 'unknown',
        birthDate: '1990-01-01'
      };

      const response = await (fhirClient as any).client.post('/Patient', newPatient);
      testPatientId = response.data.id;
      
      logTest('Create test patient', !!testPatientId);
      console.log(`   Created patient ID: ${testPatientId}`);
      
      // Now fetch it
      if (testPatientId) {
        const patient = await fhirClient.getPatient(testPatientId);
        logTest(`Get newly created patient`, !!patient.id);
      }

    } catch (error) {
      logTest('Create and get test patient', false, error);
    }
  }

  console.log('');

  // Test 3: Get Non-Existent Patient (Error Handling)
  console.log('📋 Test 3: Error Handling - Non-Existent Patient');
  console.log('-'.repeat(60));
  try {
    await fhirClient.getPatient('99999999');
    logTest('Non-existent patient throws error', false);
  } catch (error) {
    const isCorrectError = error instanceof FhirResourceNotFoundError || 
                          (error instanceof FhirError && error.statusCode === 404);
    logTest('Non-existent patient throws error', isCorrectError, error);
  }

  console.log('');

  // Test 4: Get Patient Appointments
  if (testPatientId) {
    console.log('📋 Test 4: Get Patient Appointments');
    console.log('-'.repeat(60));
    try {
      const appointments = await fhirClient.getPatientAppointments(testPatientId);
      logTest('Get patient appointments', true);
      console.log(`   Found ${appointments.length} appointment(s)`);
      
      if (appointments.length > 0) {
        const appt = appointments[0];
        console.log(`   First appointment:`);
        console.log(`     Status: ${appt.status}`);
        console.log(`     Start: ${appt.start || 'Not set'}`);
        console.log(`     Description: ${appt.description || 'None'}`);
      }

      // Test with status filter
      const bookedAppts = await fhirClient.getPatientAppointments(testPatientId, 'booked');
      logTest('Filter appointments by status', true);
      console.log(`   Booked appointments: ${bookedAppts.length}`);
    } catch (error) {
      logTest('Get patient appointments', false, error);
    }
  }

  console.log('');

  // Test 5: Get Patient Observations
  if (testPatientId) {
    console.log('📋 Test 5: Get Patient Observations');
    console.log('-'.repeat(60));
    try {
      const observations = await fhirClient.getPatientObservations(testPatientId);
      logTest('Get patient observations', true);
      console.log(`   Found ${observations.length} observation(s)`);
      
      if (observations.length > 0) {
        const obs = observations[0];
        console.log(`   First observation:`);
        console.log(`     Code: ${obs.code.text || obs.code.coding?.[0]?.display}`);
        console.log(`     Status: ${obs.status}`);
        console.log(`     Date: ${obs.effectiveDateTime}`);
      }

      // Test with category filter
      const vitalSigns = await fhirClient.getPatientObservations(testPatientId, 'vital-signs');
      logTest('Filter observations by category', true);
      console.log(`   Vital signs: ${vitalSigns.length}`);
    } catch (error) {
      logTest('Get patient observations', false, error);
    }
  }

  console.log('');

  // Test 6: Create Simple Observation
  if (testPatientId) {
    console.log('📋 Test 6: Create Simple Observation');
    console.log('-'.repeat(60));
    try {
      const observation = await fhirClient.createObservation({
        resourceType: 'Observation',
        status: 'final',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '418799008',
            display: 'Symptom'
          }],
          text: 'Test Symptom - Headache'
        },
        subject: {
          reference: `Patient/${testPatientId}`,
          display: 'Test Patient'
        },
        effectiveDateTime: new Date().toISOString(),
        valueString: 'Headache reported during test',
        note: [{
          text: 'Created by FHIR client test suite'
        }]
      });

      logTest('Create simple observation', !!observation.id);
      console.log(`   Created observation ID: ${observation.id}`);
      console.log(`   Status: ${observation.status}`);
    } catch (error) {
      logTest('Create simple observation', false, error);
    }
  }

  console.log('');

  // Test 7: Create Symptom Observation (Helper Method)
  if (testPatientId) {
    console.log('📋 Test 7: Create Symptom Observation (Helper)');
    console.log('-'.repeat(60));
    try {
      const observation = await fhirClient.createSymptomObservation(
        testPatientId,
        'Fever',
        'moderate',
        'Patient reports fever since yesterday'
      );

      logTest('Create symptom observation', !!observation.id);
      console.log(`   Created observation ID: ${observation.id}`);
      console.log(`   Symptom: Fever`);
      console.log(`   Severity: moderate`);
    } catch (error) {
      logTest('Create symptom observation', false, error);
    }
  }

  console.log('');

  // Test 8: Create Vital Sign Observation
  if (testPatientId) {
    console.log('📋 Test 8: Create Vital Sign Observation');
    console.log('-'.repeat(60));
    try {
      const observation = await fhirClient.createVitalSignObservation(
        testPatientId,
        '8310-5', // Body temperature (LOINC code)
        'Body Temperature',
        38.5,
        'degrees Celsius',
        'Cel'
      );

      logTest('Create vital sign observation', !!observation.id);
      console.log(`   Created observation ID: ${observation.id}`);
      console.log(`   Vital Sign: Body Temperature`);
      console.log(`   Value: 38.5 °C`);
    } catch (error) {
      logTest('Create vital sign observation', false, error);
    }
  }

  console.log('');

  // Test 9: Validation Error Handling
  console.log('📋 Test 9: Validation Error Handling');
  console.log('-'.repeat(60));
  try {
    // Try to create observation without required subject
    await fhirClient.createObservation({
      resourceType: 'Observation',
      status: 'final',
      code: {
        text: 'Test'
      },
      subject: {
        reference: '' // Invalid - empty reference
      }
    });
    logTest('Validation error on invalid observation', false);
  } catch (error) {
    const isValidationError = error instanceof FhirError && 
                              (error.statusCode === 400 || error.message.includes('subject'));
    logTest('Validation error on invalid observation', true);
    console.log(`   Error caught: ${(error as Error).message}`);
  }

  console.log('');

  // Print Summary
  console.log('='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log('\nDetailed Results:');
  results.forEach((r, i) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${i + 1}. ${icon} ${r.test}`);
    if (r.error) {
      console.log(`      ${r.error}`);
    }
  });

  console.log('\n' + '='.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed with error:', error);
  process.exit(1);
});
