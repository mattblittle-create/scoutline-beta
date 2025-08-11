export default function HomePage() {
  return (
    <section style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>ScoutLine Beta</h1>
      <p style={{ marginBottom: 24 }}>
        Welcome to the ScoutLine Beta test site. Use the links below to explore each role's view.
      </p>
      <nav>
        <ul style={{ listStyle: "none", padding: 0, lineHeight: 2 }}>
          <li><a href="/admin" style={{ color: "#2563eb", textDecoration: "none" }}>🛠 Admin View</a></li>
          <li><a href="/player" style={{ color: "#2563eb", textDecoration: "none" }}>⚾ Player View</a></li>
          <li><a href="/coach" style={{ color: "#2563eb", textDecoration: "none" }}>🎓 Coach View</a></li>
        </ul>
      </nav>
      <footer style={{ marginTop: 48, fontSize: 12, color: "#6b7280" }}>
        © {new Date().getFullYear()} ScoutLine • Beta Environment
      </footer>
    </section>
  );
}
