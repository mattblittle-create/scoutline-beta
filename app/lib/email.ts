export async function sendEmail(to: string, subject: string, html: string) {
  // TODO: integrate your ESP (Resend, SES, SendGrid, etc.)
  console.log("DEV EMAIL ->", { to, subject, html });
}
