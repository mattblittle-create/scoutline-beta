// app/coach/[slug]/error.tsx
'use client';

import * as React from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // This shows up in Vercel’s Function Logs for the request
  console.error('Coach page error:', error);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
        Something went wrong
      </h1>
      <p style={{ color: '#475569' }}>
        We couldn’t load this profile. Try again in a moment.
      </p>
      {error?.digest ? (
        <p style={{ color: '#64748b' }}>
          Debug digest: <code>{error.digest}</code>
        </p>
      ) : null}
      <button
        onClick={() => reset()}
        style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          background: '#fff',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </main>
  );
}
