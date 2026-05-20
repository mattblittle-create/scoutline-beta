// app/dashboard/team/invites/layout.tsx

import type { ReactNode } from "react";

export const metadata = {
  title: "Invites • Team Dashboard • ScoutLine",
  description: "Send and manage invites for your team.",
};

export default function TeamInvitesLayout({ children }: { children: ReactNode }) {
  // Header is handled globally by app/dashboard/team/layout.tsx
  return <>{children}</>;
}
