// scripts/test-email.js

import 'dotenv/config';   // loads .env.local
import { Resend } from 'resend';

async function main() {
  try {
    // Initialize Resend with API key from .env.local
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send test email
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'support@myscoutline.com',
      to: 'matt.b.little@gmail.com',  // 👈 your personal email (or work)
      subject: 'ScoutLine Test Email',
      html: '<p>Hello Matt 👋<br>This is a test email from Resend + ScoutLine.</p>',
    });

    console.log('✅ Email sent:', result);
  } catch (err) {
    console.error('❌ Error sending email:', err);
  }
}

main();
