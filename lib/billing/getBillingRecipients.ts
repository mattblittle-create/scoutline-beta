// lib/billing/getBillingRecipients.ts

import { prisma } from "@/lib/prisma";

export type BillingOwnershipType = "PLAYER_OWNED" | "TEAM_OWNED";

export type BillingRecipientRole = "PLAYER" | "PARENT" | "TEAM_ADMIN";

export type BillingDeliveryType = "PRIMARY" | "CC" | "INFORMATIONAL";

export type BillingEventType =
  | "UPCOMING_INVOICE"
  | "PAYMENT_REMINDER"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAST_DUE"
  | "CARD_EXPIRING"
  | "CARD_UPDATE_REQUIRED"
  | "PLAN_CHANGED"
  | "BILLING_OWNERSHIP_CHANGED"
  | "DISCOUNT_APPLIED"
  | "DISCOUNT_REMOVED"
  | "REFUND_ISSUED"
  | "AMOUNT_CHANGED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLATION_CONFIRMED";

export type BillingRecipient = {
  email: string;
  name?: string | null;
  role: BillingRecipientRole;
  delivery: BillingDeliveryType;
};

type ManualRecipient = {
  email?: string | null;
  name?: string | null;
};

type GetPlayerOwnedBillingRecipientsInput = {
  playerProfileId: string;
};

type GetTeamOwnedBillingRecipientsInput = {
  playerProfileId?: string | null;

  /**
   * Team admin/billing contacts are passed in for now so this helper does not
   * depend on final Team Dashboard schema details.
   */
  teamAdminRecipients: ManualRecipient[];

  /**
   * Team-owned billing notifications go to team billing/admin contacts only.
   * Player/family billing visibility is handled on the player/parent billing UI,
   * not by sending team invoices or team payment notices to families.
   */
  includePlayerFamilyInformationalCopy?: boolean;
};

type GetBillingRecipientsInput =
  | ({
      ownershipType: "PLAYER_OWNED";
      eventType?: BillingEventType;
    } & GetPlayerOwnedBillingRecipientsInput)
  | ({
      ownershipType: "TEAM_OWNED";
      eventType?: BillingEventType;
    } & GetTeamOwnedBillingRecipientsInput);

function cleanEmail(value?: string | null) {
  const email = String(value || "").trim().toLowerCase();
  return email && email.includes("@") ? email : "";
}

function cleanName(value?: string | null) {
  const name = String(value || "").trim();
  return name || null;
}

function uniqueRecipients(recipients: BillingRecipient[]) {
  const seen = new Set<string>();
  const unique: BillingRecipient[] = [];

  for (const recipient of recipients) {
    const email = cleanEmail(recipient.email);
    if (!email || seen.has(email)) continue;

    seen.add(email);

    unique.push({
      ...recipient,
      email,
      name: cleanName(recipient.name),
    });
  }

  return unique;
}

async function getLinkedPlayerFamilyRecipients(playerProfileId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { id: playerProfileId },
    select: {
      id: true,
      email: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!profile?.id) {
    return [];
  }

  const recipients: BillingRecipient[] = [];

  const playerEmail = cleanEmail(profile.email || profile.user?.email);

  if (playerEmail) {
    recipients.push({
      email: playerEmail,
      name: profile.user?.name || null,
      role: "PLAYER",
      delivery: "PRIMARY",
    });
  }

  const parentLinks = await prisma.parentPlayerLink.findMany({
    where: {
      playerProfileId: profile.id,
    },
    select: {
      parentProfile: {
        select: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  for (const link of parentLinks) {
    const parentEmail = cleanEmail(link.parentProfile?.user?.email);

    if (!parentEmail) continue;

    recipients.push({
      email: parentEmail,
      name: link.parentProfile?.user?.name || null,
      role: "PARENT",
      delivery: "CC",
    });
  }

  return uniqueRecipients(recipients);
}

export async function getPlayerOwnedBillingRecipients({
  playerProfileId,
}: GetPlayerOwnedBillingRecipientsInput) {
  return getLinkedPlayerFamilyRecipients(playerProfileId);
}

export async function getTeamOwnedBillingRecipients({
  playerProfileId,
  teamAdminRecipients,
  includePlayerFamilyInformationalCopy = false,
}: GetTeamOwnedBillingRecipientsInput) {
  const recipients: BillingRecipient[] = [];

  for (const admin of teamAdminRecipients) {
    const email = cleanEmail(admin.email);
    if (!email) continue;

    recipients.push({
      email,
      name: cleanName(admin.name),
      role: "TEAM_ADMIN",
      delivery: "PRIMARY",
    });
  }

  if (includePlayerFamilyInformationalCopy && playerProfileId) {
    const familyRecipients = await getLinkedPlayerFamilyRecipients(playerProfileId);

    for (const recipient of familyRecipients) {
      recipients.push({
        ...recipient,
        delivery: "INFORMATIONAL",
      });
    }
  }

  return uniqueRecipients(recipients);
}

export async function getBillingRecipients(input: GetBillingRecipientsInput) {
  if (input.ownershipType === "PLAYER_OWNED") {
    return getPlayerOwnedBillingRecipients({
      playerProfileId: input.playerProfileId,
    });
  }

  return getTeamOwnedBillingRecipients({
    playerProfileId: input.playerProfileId,
    teamAdminRecipients: input.teamAdminRecipients,
    includePlayerFamilyInformationalCopy:
      input.includePlayerFamilyInformationalCopy ?? false,
  });
}

export function splitBillingRecipients(recipients: BillingRecipient[]) {
  const clean = uniqueRecipients(recipients);

  return {
    all: clean,
    primary: clean.filter((r) => r.delivery === "PRIMARY"),
    cc: clean.filter((r) => r.delivery === "CC"),
    informational: clean.filter((r) => r.delivery === "INFORMATIONAL"),
    emails: clean.map((r) => r.email),
    primaryEmails: clean.filter((r) => r.delivery === "PRIMARY").map((r) => r.email),
    ccEmails: clean.filter((r) => r.delivery === "CC").map((r) => r.email),
    informationalEmails: clean
      .filter((r) => r.delivery === "INFORMATIONAL")
      .map((r) => r.email),
  };
}