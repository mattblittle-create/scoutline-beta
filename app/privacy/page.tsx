// app/privacy/page.tsx
export const metadata = {
  title: "Privacy Policy | ScoutLine",
  robots: { index: false, follow: false }, // keep page "hidden" from search
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ marginBottom: 8 }}>ScoutLine — Privacy Policy</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        <strong>Effective Date:</strong> January 1, 2025 &nbsp; • &nbsp;
        <strong>Last Updated:</strong> August 14, 2025
      </p>

      <h2>1. Introduction</h2>
      <p>
        ScoutLine (“we,” “our,” “us”) values your privacy. This Privacy Policy explains
        how we collect, use, and protect your personal information.
      </p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li>
          <strong>Personal Information:</strong> Name, email address, phone number, date of
          birth, school, athletic information, recruiting preferences.
        </li>
        <li>
          <strong>Content:</strong> Photos, videos, performance metrics, messages you send
          through the platform.
        </li>
        <li>
          <strong>Usage Data:</strong> IP address, browser type, device information, pages
          visited.
        </li>
        <li>
          <strong>Payment Information:</strong> If you purchase premium features, we
          collect payment details through our secure payment processor.
        </li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>Provide and improve ScoutLine services</li>
        <li>Customize your experience</li>
        <li>Facilitate communication between players, parents, and coaches</li>
        <li>Send service updates and important account notifications</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>4. Advertising</h2>
      <p>
        ScoutLine may work with advertising partners to display ads to users on the Basic
        or Free plan. These ads may be targeted based on your profile information,
        preferences, and activity within the platform. Paid plan subscribers will not see
        advertisements.
      </p>
      <p>
        We may share aggregated, non-personally identifiable information with advertisers
        to help deliver relevant ads and measure effectiveness.
      </p>

      <h2>5. Sharing Your Information</h2>
      <p>We do not sell your personal information. We may share it:</p>
      <ul>
        <li>
          With coaches, recruiters, and other users as you choose to make your profile
          visible
        </li>
        <li>With service providers who help operate the platform</li>
        <li>When required by law or to protect our rights and safety</li>
      </ul>

      <h2>6. Cookies &amp; Tracking</h2>
      <p>
        We use cookies and similar tracking technologies to improve your experience and
        analyze usage. You can adjust your browser settings to disable cookies, but some
        features may not work.
      </p>

      <h2>7. Data Security</h2>
      <p>
        We use industry-standard measures to protect your data. However, no online service
        is 100% secure.
      </p>

      <h2>8. Your Rights</h2>
      <p>Depending on your location and plan, you may have rights to:</p>
      <ul>
        <li>Access and correct your personal data</li>
        <li>Request deletion of your account and data</li>
        <li>Opt out of marketing communications</li>
      </ul>

      <h2>9. Children’s Privacy</h2>
      <p>
        If you are under 13, you may not use ScoutLine without parental consent. We do not
        knowingly collect personal data from children under 13 without appropriate
        consent.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy at any time. Continued use of the service means
        you accept the updated policy.
      </p>

      <h2>11. Contact</h2>
      <p>
        If you have questions about this Privacy Policy, contact us at{" "}
        <a href="mailto:support@myscoutline.com">support@myscoutline.com</a>.
      </p>
    </main>
  );
}
