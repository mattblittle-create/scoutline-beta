// Server Component wrapper for /verify
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import VerifyClient from "./Client";

export default function VerifyPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <VerifyClient />
    </Suspense>
  );
}
