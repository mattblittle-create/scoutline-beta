// app/terms/page.tsx
export const metadata = {
  title: "Terms & Conditions | ScoutLine",
  robots: { index: false, follow: false }, // keep page "hidden" from search
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ marginBottom: 8 }}>ScoutLine — Terms &amp; Conditions</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        <strong>Effective Date:</strong> January 1, 2025 &nbsp; • &nbsp;
        <strong>Last Updated:</strong> August 14, 2025
      </p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to ScoutLine (“we,” “our,” “us”). By creating an account, accessing, or
        using our website or services, you agree to comply with these Terms &amp;
        Conditions (“Terms”). If you do not agree, please do not use ScoutLine.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to use ScoutLine. If you are under 18, you must
        have permission from a parent or legal guardian.
      </p>

      <h2>3. Purpose of the Service</h2>
      <p>
        ScoutLine is a platform designed to help athletes, parents, and coaches organize
        recruiting information, track athletic metrics, share highlight videos, and
        communicate with potential recruiters.
      </p>

      <h2>4. User Responsibilities</h2>
      <ul>
        <li>Provide accurate, up-to-date information on your profile.</li>
        <li>Use the platform for lawful purposes only.</li>
        <li>
          Do not upload, post, or share content that is offensive, defamatory, harassing,
          or violates another person’s rights.
        </li>
        <li>Do not attempt to hack, disrupt, or reverse-engineer the platform.</li>
      </ul>

      <h2>5. Content Ownership &amp; License</h2>
      <ul>
        <li>
          You own the content you upload, but you grant ScoutLine a non-exclusive,
          worldwide license to store, display, and share your content as needed to
          operate the service.
        </li>
        <li>You are responsible for securing rights to any content you upload.</li>
      </ul>

      <h2>6. Communication</h2>
      <p>
        ScoutLine may send you service updates, notifications, or promotional messages.
        You can opt out of promotional communications, but service-related notifications
        are required for account use.
      </p>

      <h2>7. Fees &amp; Payments</h2>
      <p>
        Some features may require payment. All fees are disclosed before purchase and are
        non-refundable unless required by law.
      </p>

      <h2>8. Advertising &amp; Marketing Use of Data</h2>
      <ul>
        <li>
          Users on the Basic or Free plan may see advertisements from ScoutLine, our
          partners, or affiliates. Paid plan subscribers will not see advertisements in
          their profiles or dashboards.
        </li>
        <li>
          All users, regardless of plan type, agree that their data may be used for
          marketing purposes by ScoutLine and its partners or affiliates. This may include
          targeted offers, promotions, and sponsored content.
        </li>
        <li>
          You may opt out of certain marketing communications, but your data may still be
          used for analytics and non-personalized marketing purposes.
        </li>
      </ul>

      <h2>9. Third-Party Links</h2>
      <p>
        ScoutLine may contain links to third-party sites. We are not responsible for their
        content, privacy policies, or practices.
      </p>

      <h2>10. Disclaimer of Warranties</h2>
      <p>
        The service is provided “as is” without any warranties, express or implied. We do
        not guarantee recruitment, scholarships, or specific results.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, ScoutLine is not liable for any indirect,
        incidental, special, consequential, or punitive damages arising from your use of
        the service.
      </p>

      <h2>12. Termination</h2>
      <p>
        We may suspend or terminate your account if you violate these Terms or if we
        believe your use of the service may harm others or the platform.
      </p>

      <h2>13. Changes to the Terms</h2>
      <p>
        We may update these Terms at any time. Continued use of ScoutLine after updates
        means you accept the revised Terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        If you have questions about these Terms, contact us at{" "}
        <a href="mailto:support@myscoutline.com">support@myscoutline.com</a>.
      </p>
    </main>
  );
}
