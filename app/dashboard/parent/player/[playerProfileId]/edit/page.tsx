// app/dashboard/parent/player/[playerProfileId]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getLinkedParentPlayer } from "@/lib/parent/getLinkedParentPlayer";
import ParentPlayerEditForm from "./ParentPlayerEditForm";

type PageProps = {
  params: {
    playerProfileId: string;
  };
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readString(obj: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export default async function ParentPlayerEditPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const playerProfileId = String(params?.playerProfileId || "").trim();
  if (!playerProfileId) notFound();

  const linked = await getLinkedParentPlayer({
    userId: user.id,
    playerProfileId,
  });

  if (!linked?.playerProfile) {
    notFound();
  }

  const playerProfile = linked.playerProfile;
  const data = asRecord(playerProfile.data);

  const firstName = readString(data, "firstName", "playerFirstName", "nameFirst");
  const lastName = readString(data, "lastName", "playerLastName", "nameLast");
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    playerProfile.user?.name?.trim() ||
    playerProfile.email.split("@")[0];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          background: "linear-gradient(180deg, #fffdf7 0%, #ffffff 100%)",
          padding: 20,
          boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: "#8a6a21",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 8,
          }}
        >
          Parent Portal
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "1.8rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          Edit Player Profile — {fullName}
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            color: "#475569",
            maxWidth: 820,
            lineHeight: 1.55,
            fontWeight: 600,
          }}
        >
          This parent-safe edit flow only allows updates for a player linked to
          your parent account.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Link
            href={`/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}`}
            style={ghostBtn}
          >
            Back to Player Overview
          </Link>

          <Link href="/dashboard/parent" style={ghostBtn}>
            Parent Dashboard
          </Link>
        </div>
      </section>

      <ParentPlayerEditForm
        playerProfileId={playerProfile.id}
        initialData={data}
        playerEmail={playerProfile.email}
      />
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
};