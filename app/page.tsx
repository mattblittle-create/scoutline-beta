export default function HomePage(){
  return (
    <div className="container" style={{paddingTop: 28, paddingBottom: 36}}>
      <span className="badge">Beta</span>
      <h1 style={{marginTop: 10}}>Recruiting clarity for players, parents, and coaches.</h1>
      <p style={{maxWidth: 720}}>
        ScoutLine brings your entire recruiting journey into one place—contacts, timelines, tasks, and progress—so you spend less time guessing and more time advancing.
      </p>

      <div style={{display:"flex", gap:12, marginTop:16}}>
        <a className="btn btn-primary" href="/pricing">Get Started</a>
        <a className="btn" href="/recruiting-journey">See how it works</a>
      </div>

      <div style={{marginTop: 28}} className="card">
        <h2 style={{marginTop: 0}}>Why ScoutLine</h2>
        <ul style={{margin:0, paddingLeft:18, color:"var(--sl-muted)"}}>
          <li>Unified profile & milestones across sports</li>
          <li>Coach & parent views that stay in sync</li>
          <li>Clean dashboards, not clutter</li>
        </ul>
      </div>
    </div>
  );
}
