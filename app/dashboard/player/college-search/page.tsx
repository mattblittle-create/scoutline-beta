// app/dashboard/player/college-search/page.tsx

import Link from "next/link";
import CollegeSearchPage from "@/app/search/page";

export default function PlayerCollegeSearchPage() {
  return (
    <>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 16px 0" }}>
        <Link
          href="/dashboard/player"
          style={{
            textDecoration: "none",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#0f172a",
            fontWeight: 800,
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>

      <CollegeSearchPage />
    </>
  );
}