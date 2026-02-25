import type { ReactNode } from "react";

export const metadata = {
  title: "Profile • Team Dashboard • ScoutLine",
  description: "Manage your team / organization profile and branding.",
};

export default function TeamOrgLayout({ children }: { children: ReactNode }) {
  // Header is handled globally by app/dashboard/team/layout.tsx
  return <>{children}</>;
}
