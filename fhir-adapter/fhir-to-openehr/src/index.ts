import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const OE_BASE = process.env.OPEN_EHR_BASE_URL || 'http://localhost:8080';
const OE_USER = process.env.OPEN_EHR_USER || '';
const OE_PASS = process.env.OPEN_EHR_PASS || '';
const OE_TEMPLATE_ID = process.env.OPEN_EHR_TEMPLATE_ID || '';

// Basic mapper stub: tailor per openEHR template/composition requirements.
function mapObservationToOpenEhr(payload: any): any {
  return { templateId: OE_TEMPLATE_ID, source: 'FHIR', payload };
}

app.post('/bridge/openehr/observation', async (req, res) => {
  try {
    const mapped = mapObservationToOpenEhr(req.body);
    const client = axios.create({
      baseURL: OE_BASE,
      auth: OE_USER && OE_PASS ? { username: OE_USER, password: OE_PASS } : undefined,
      timeout: 15000
    });
    // Adjust endpoint path to match your openEHR instance (e.g., EHRbase REST API)
    const resp = await client.post('/rest/openehr/v1/compositions', mapped);
    res.status(200).json({ success: true, result: resp.data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Unknown error' });
  }
});

const port = parseInt(process.env.PORT || '7001', 10);
app.listen(port, () => console.log(`FHIR→openEHR adapter listening on ${port}`));
