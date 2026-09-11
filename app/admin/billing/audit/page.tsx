// app/admin/billing/audit/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeString(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function fmtDate(d: Date) {
  return d.toLocaleString("en-US");
}

export default async function AdminBillingAuditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};

  const eventTypeRaw = sp.eventType;
  const targetTypeRaw = sp.targetType;
  const targetIdRaw = sp.targetId;
  const qRaw = sp.q;

  const eventType = Array.isArray(eventTypeRaw) ? eventTypeRaw[0] : eventTypeRaw;
  const targetType = Array.isArray(targetTypeRaw) ? targetTypeRaw[0] : targetTypeRaw;
  const targetId = Array.isArray(targetIdRaw) ? targetIdRaw[0] : targetIdRaw;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;

  const where: any = {
    ...(eventType ? { eventType } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
    ...(q
      ? {
          OR: [
            { message: { contains: q, mode: "insensitive" } },
            { eventType: { contains: q, mode: "insensitive" } },
            { targetType: { contains: q, mode: "insensitive" } },
            { targetId: { contains: q, mode: "insensitive" } },
            { actorType: { contains: q, mode: "insensitive" } },
            { actorId: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [logs, eventTypes, targetTypes] = await Promise.all([
    prisma.billingAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    prisma.billingAuditLog.findMany({
      distinct: ["eventType"],
      orderBy: { eventType: "asc" },
      select: { eventType: true },
    }),

    prisma.billingAuditLog.findMany({
      distinct: ["targetType"],
      orderBy: { targetType: "asc" },
      select: { targetType: true },
    }),
  ]);

  return (
    <main style={{ padding: 18, maxWidth: 1300, margin: "0 auto" }}>
      <div style={headerStyle}>
        <div>
          <div style={{ color: "#64748b", fontWeight: 900 }}>
            ScoutLine Admin
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
            Billing Audit Log
          </h1>
          <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
            Showing newest 100 billing audit events.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin/billing/overview" style={secondaryButtonStyle}>
            Billing Overview
          </Link>
          <Link href="/admin" style={primaryButtonStyle}>
            Back to Admin
          </Link>
        </div>
      </div>

      <form style={filterCardStyle}>
        <div style={filterGridStyle}>
          <label style={labelStyle}>
            Search
            <input
              name="q"
              defaultValue={q || ""}
              placeholder="message, target, actor..."
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Event Type
            <select name="eventType" defaultValue={eventType || ""} style={inputStyle}>
              <option value="">All events</option>
              {eventTypes.map((item) => (
                <option key={item.eventType} value={item.eventType}>
                  {item.eventType}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Target Type
            <select name="targetType" defaultValue={targetType || ""} style={inputStyle}>
              <option value="">All targets</option>
              {targetTypes.map((item) => (
                <option key={item.targetType} value={item.targetType}>
                  {item.targetType}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Target ID
            <input
              name="targetId"
              defaultValue={targetId || ""}
              placeholder="playerProfileId, invoiceId..."
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" style={primaryButtonStyle}>
            Apply Filters
          </button>

          <Link href="/admin/billing/audit" style={secondaryButtonStyle}>
            Clear
          </Link>
        </div>
      </form>

      <section style={tableCardStyle}>
        {logs.length === 0 ? (
          <div style={{ color: "#64748b", fontWeight: 800 }}>
            No billing audit events found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Event</Th>
                  <Th>Actor</Th>
                  <Th>Target</Th>
                  <Th>Message</Th>
                  <Th>Metadata</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <Td>{fmtDate(log.createdAt)}</Td>
                    <Td>
                      <span style={pillStyle}>{log.eventType}</span>
                    </Td>
                    <Td>
                      <div>{log.actorType}</div>
                      {log.actorId ? (
                        <div style={mutedSmallStyle}>{log.actorId}</div>
                      ) : null}
                    </Td>
                    <Td>
                      <div>{log.targetType}</div>
                      <div style={mutedSmallStyle}>{log.targetId}</div>
                    </Td>
                    <Td>{log.message}</Td>
                    <Td>
                      {log.metadata ? (
                        <details>
                          <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                            View
                          </summary>
                          <pre style={preStyle}>{safeString(log.metadata)}</pre>
                        </details>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16,
};

const filterCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  marginBottom: 16,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 11px",
  fontSize: 14,
  color: "#0f172a",
};

const tableCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 950,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontWeight: 700,
  verticalAlign: "top",
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "4px 8px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const mutedSmallStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  wordBreak: "break-all",
};

const preStyle: React.CSSProperties = {
  maxWidth: 420,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  fontSize: 12,
  color: "#0f172a",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#fff",
  border: "1px solid #0ea5e9",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  fontWeight: 900,
  textDecoration: "none",
};