export async function notificationEmailWorkflow(deliveryIds: string[]) {
  "use workflow";
  for (const id of deliveryIds) await deliverEmailStep(id);
}
async function deliverEmailStep(id: string) {
  "use step";
  const { deliverNotificationEmail } = await import("@/lib/notificationEmails");
  await deliverNotificationEmail(id);
}
