// app/admin/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const { user, roles, actingUser } = ctx;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      {actingUser ? (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "#fff7ed",
            borderBottom: "1px solid rgba(0,0,0,0.12)",
            padding: "10px 14px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 900 }}>
            Viewing as{" "}
            <span style={{ textDecoration: "underline" }}>{actingUser.email}</span>{" "}
            <span style={{ fontWeight: 700, opacity: 0.75 }}>
              (admin: {user?.email} · roles: {roles?.join(", ")})
            </span>
          </div>

          {/* ✅ hard nav so cookies re-read and banner disappears immediately */}
          <a
            href={`/admin/impersonate?clear=1&next=${encodeURIComponent("/admin/search")}`}
            style={{ color: "#9a3412", fontWeight: 900, textDecoration: "none" }}
          >
            Exit view
          </a>
        </div>
      ) : null}

      {children}
    </div>
  );
}
