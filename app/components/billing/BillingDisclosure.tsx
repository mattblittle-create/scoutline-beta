// app/components/billing/BillingDisclosure.tsx
import React from "react";

type BillingDisclosureProps = {
  /** Optional: tighten spacing for dense cards/sidebars */
  compact?: boolean;
  /** Optional: allow callers to extend/override styles */
  style?: React.CSSProperties;
  /** Optional: allow callers to pass a className if you ever move to CSS/Tailwind */
  className?: string;
};

export default function BillingDisclosure({
  compact = false,
  style,
  className,
}: BillingDisclosureProps) {
  return (
    <div
      className={className}
      style={{
        marginTop: compact ? 8 : 10,
        fontSize: 12,
        color: "#64748b",
        lineHeight: 1.5,
        ...style,
      }}
    >
      Payment information is securely collected and managed through a third-party hosted
      payment portal. ScoutLine does not store full payment credentials and retains only a
      limited, non-sensitive summary (payment type, card brand, and last four digits) for
      administrative and record-keeping purposes.
      <br />
      <br />
      Credit card payments include a 3% processing fee. Debit card payments have no processing fee.
    </div>
  );
}
