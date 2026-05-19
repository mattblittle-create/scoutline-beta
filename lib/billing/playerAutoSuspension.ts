// lib/billing/playerAutoSuspension.ts

import { prisma } from "@/lib/prisma";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";

function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export async function maybeAutoSuspendPlayerForDunning(args: {
  invoiceId: string;
}) {
  const now = new Date();

  const invoice = await prisma.playerInvoice.findUnique({
    where: { id: args.invoiceId },
    include: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          playerBillingStatus: true,
          hasActivePlayerBilling: true,
        },
      },
    },
  });

  if (!invoice) {
    return { ok: false, skipped: true, reason: "Invoice not found." };
  }

  if (invoice.status !== "PAST_DUE") {
    return { ok: true, skipped: true, reason: "Invoice is not past due." };
  }

  if (invoice.playerProfile.playerBillingStatus === "Suspended") {
    return { ok: true, skipped: true, reason: "Player is already suspended." };
  }

  const overdueDays = daysBetween(invoice.dueDate, now);

  const shouldSuspend =
    invoice.failedAttemptCount >= 3 && overdueDays >= 7;

  if (!shouldSuspend) {
    return {
      ok: true,
      skipped: true,
      reason: "Auto-suspension threshold not met.",
      failedAttemptCount: invoice.failedAttemptCount,
      overdueDays,
    };
  }

  await prisma.playerProfile.update({
    where: { id: invoice.playerProfileId },
    data: {
      hasActivePlayerBilling: false,
      playerBillingStatus: "Suspended",
    },
  });

  await createBillingAuditLog({
    actorType: "SYSTEM",
    targetType: "PLAYER_PROFILE",
    targetId: invoice.playerProfileId,
    eventType: "AUTO_ACCOUNT_SUSPENDED",
    message: `Player account automatically suspended after failed billing recovery.`,
    metadata: {
      invoiceId: invoice.id,
      externalId: invoice.externalId,
      failedAttemptCount: invoice.failedAttemptCount,
      overdueDays,
      dueDate: invoice.dueDate,
      amountCents: invoice.amountCents,
      cardFeeCents: invoice.cardFeeCents,
      email: invoice.playerProfile.email,
    },
  });

  return {
    ok: true,
    suspended: true,
    playerProfileId: invoice.playerProfileId,
    invoiceId: invoice.id,
    failedAttemptCount: invoice.failedAttemptCount,
    overdueDays,
  };
}