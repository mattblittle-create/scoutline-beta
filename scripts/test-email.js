import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: 'matt.b.little@gmail.com', // your test email
      subject: '✅ Resend Test Email',
      html: '<p>If you got this, Resend is working correctly with your new API key!</p>',
    });

    console.log('Email sent:', data);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

main();
