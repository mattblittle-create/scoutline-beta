// app/account/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ClientAccountPage from "./ClientAccountPage";

export default function AccountPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <ClientAccountPage />
    </Suspense>
  );
}
