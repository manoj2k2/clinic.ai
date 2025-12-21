import express from  'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json({ limit: '5mb' }));

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

app.post('/bridge/email/send-document', async (req, res) => {
  try {
    const { to, subject, fhir, attachments } = req.body;
    if (!to || !subject || !fhir) {
      return res.status(400).json({ success: false, error: 'Missing to/subject/fhir' });
    }
    const mail = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text: 'Clinical document attached.',
      attachments: [
        { filename: 'resource.json', content: JSON.stringify(fhir, null, 2) },
        ...((attachments as any[]) || [])
      ]
    });
    res.status(200).json({ success: true, messageId: mail.messageId });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Email send failed' });
  }
});

const port = parseInt(process.env.PORT || '7002', 10);
app.listen(port, () => console.log(`FHIR→Email adapter listening on ${port}`));
