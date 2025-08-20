import { Suspense } from "react";
import GetStartedClient from "./GetStartedClient";

export const metadata = {
  title: "Get Started • ScoutLine",
  description: "Choose your plan and begin your profile.",
};

// Ensure this page doesn't try to fully prerender while it waits for client params
export const dynamic = "force-dynamic";

export default function GetStartedPage() {
  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: "0 16px" }}>
      <Suspense
        fallback={
          <div style={{ textAlign: "center", padding: 40 }}>
            Loading your selection…
          </div>
        }
      >
        <GetStartedClient />
      </Suspense>
    </main>
  );
}
