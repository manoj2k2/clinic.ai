import express from 'express';

const app = express();
app.use(express.text({ type: ['text/plain', 'text/csv'], limit: '5mb' }));
app.use(express.json({ limit: '5mb' }));

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cols[i] || '').trim()));
    return row;
  });
}

function bundle(entries: any[]): any {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: entries.map(resource => ({ resource }))
  };
}

app.post('/tofhir/csv/patient', (req, res) => {
  try {
    const input = typeof req.body === 'string' ? req.body : (req.body.csv || '');
    const rows = parseCSV(input);
    const patients = rows.map(r => ({
      resourceType: 'Patient',
      identifier: r.identifier ? [{ system: r.identifierSystem || 'urn:local', value: r.identifier }] : undefined,
      name: (r.family || r.given) ? [{ family: r.family || undefined, given: r.given ? [r.given] : undefined }] : undefined,
      birthDate: r.birthDate || undefined,
      gender: (r.gender as any) || undefined
    }));
    return res.json(bundle(patients));
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to transform CSV to FHIR Patient' });
  }
});

app.post('/tofhir/csv/observation', (req, res) => {
  try {
    const input = typeof req.body === 'string' ? req.body : (req.body.csv || '');
    const rows = parseCSV(input);
    const observations = rows.map(r => ({
      resourceType: 'Observation',
      status: (r.status || 'final'),
      subject: r.subjectId ? { reference: `Patient/${r.subjectId}` } : undefined,
      code: (r.code || r.display) ? { coding: [{ system: r.system || 'http://loinc.org', code: r.code, display: r.display }] } : undefined,
      valueQuantity: (r.value && r.unit) ? { value: parseFloat(r.value), unit: r.unit } : undefined,
      effectiveDateTime: r.effectiveDateTime || undefined
    }));
    return res.json(bundle(observations));
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to transform CSV to FHIR Observation' });
  }
});

const port = parseInt(process.env.PORT || '7011', 10);
app.listen(port, () => console.log(`ToFHIR CSV adapter listening on ${port}`));
