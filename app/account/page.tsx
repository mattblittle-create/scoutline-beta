// app/account/page.tsx
import { Suspense } from "react";
import ClientAccountPage from "./ClientAccountPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <Suspense fallback={<main style={{ padding: 16 }}>Loading…</main>}>
      <ClientAccountPage />
    </Suspense>
  );
}
