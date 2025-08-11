export default function AdminPage() {
  return (
    <section style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Admin — Demo</h1>
      <p style={{ marginBottom: 12 }}>
        Placeholder dashboard for ScoutLine. In the real app, admin can add/edit players & coaches, manage commitments, and view reports.
      </p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>✔ Create/edit profiles</li>
        <li>✔ Toggle “Committed” and set college</li>
        <li>✔ Filter/search players</li>
        <li>✔ Basic metrics fields</li>
      </ul>
      <p style={{ marginTop: 32 }}><a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>⬅ Back to Home</a></p>
    </section>
  );
}
