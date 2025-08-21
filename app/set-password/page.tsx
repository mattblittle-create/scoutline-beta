// Server Component wrapper for /set-password
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import SetPasswordClient from "./Client";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <SetPasswordClient />
    </Suspense>
  );
}
