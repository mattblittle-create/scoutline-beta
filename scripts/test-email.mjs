// scripts/test-email.mjs
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' }); // load your local env vars

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || 'support@myscoutline.com';
const to = process.env.TEST_EMAIL_TO || 'matt.b.little@gmail.com';

if (!apiKey) {
  console.error('❌ Missing RESEND_API_KEY in .env.local');
  process.exit(1);
}

const resend = new Resend(apiKey);

try {
  const result = await resend.emails.send({
    from,
    to,
    subject: 'ScoutLine Test Email (Resend)',
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 8px">Hello from ScoutLine 👋</h2>
        <p>This is a test email sent via Resend from your local script.</p>
        <p style="color:#64748b;font-size:12px">If you didn't expect this, you can ignore it.</p>
      </div>
    `.trim()
  });

  console.log('✅ Sent! Resend id:', result?.data?.id ?? result);
} catch (err) {
  console.error('❌ Error from Resend:', err);
  process.exit(1);
}
