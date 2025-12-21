import express from 'express';

const app = express();
app.use(express.text({ type: ['text/plain', 'application/hl7-v2', 'application/edi-hl7'], limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));

function parseHL7v2(raw: string) {
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  const segs = lines.map(l => l.split('|'));
  const getSeg = (name: string) => segs.find(s => s[0] === name);
  const pid = getSeg('PID');
  return { pid };
}

app.post('/tofhir/hl7v2/patient', (req, res) => {
  try {
    const msg = typeof req.body === 'string' ? req.body : (req.body.hl7 || '');
    const { pid } = parseHL7v2(msg);
    if (!pid) return res.status(400).json({ error: 'No PID segment found' });

    // HL7 PID fields (rough mapping):
    // PID|1|externalId|identifier||Family^Given||BirthDate|Gender
    const identifier = pid[3] || pid[2]; // CX
    const name = (pid[5] || '').split('^');
    const family = name[0] || undefined;
    const given = name[1] || undefined;
    const birthDate = pid[7] ? pid[7].substring(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : undefined;
    const gender = pid[8] ? ({ M: 'male', F: 'female' } as any)[pid[8]] || 'unknown' : undefined;

    const patient = {
      resourceType: 'Patient',
      identifier: identifier ? [{ system: 'urn:hl7v2:PID-3', value: identifier }] : undefined,
      name: (family || given) ? [{ family, given: given ? [given] : undefined }] : undefined,
      birthDate,
      gender
    };

    return res.json({ resourceType: 'Bundle', type: 'collection', entry: [{ resource: patient }] });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to transform HL7v2 to FHIR Patient' });
  }
});

const port = parseInt(process.env.PORT || '7012', 10);
app.listen(port, () => console.log(`ToFHIR HL7v2 adapter listening on ${port}`));
