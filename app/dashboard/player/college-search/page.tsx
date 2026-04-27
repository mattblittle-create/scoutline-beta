// app/dashboard/player/college-search/page.tsx

import Link from "next/link";
import CollegeSearchPage from "@/app/search/page";
import { cookies } from "next/headers";

export default async function PlayerCollegeSearchPage() {
  const cookieStore = cookies();
  const uid = cookieStore.get("scoutline_uid")?.value;

  // TODO (next step): fetch player profile by uid
  // const player = await getPlayerByUserId(uid);
  return (
    <>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 16px 0" }}>
<Link href="/dashboard/player" style={backToDashboardStyle}>
  ← Back to Dashboard
</Link>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px" }}>
        <CollegeSearchPage />
      </div>
    </>
  );
}

const backToDashboardStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
};