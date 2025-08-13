export default function HomePage(){
  return (
    <div className="container" style={{paddingTop: 28, paddingBottom: 36}}>
      <span className="badge">Beta</span>
      <h1 style={{marginTop: 10}}>Your recruiting journey, organized and in your control. Get seen. Get signed. Get ahead.</h1>
      <p style={{maxWidth: 720}}>
        ScoutLine brings your entire recruiting journey into one place—athlete info, highlights, metrics, contacts, timelines and to-dos, and progress—so you spend less time guessing and more time advancing.
      </p>

      <div style={{display:"flex", gap:12, marginTop:16}}>
        <a className="btn btn-primary" href="/pricing">Get Started</a>
        <a className="btn" href="/recruiting-journey">See how it works</a>
      </div>

      <div style={{marginTop: 28}} className="card">
        <h2 style={{marginTop: 0}}>Why ScoutLine</h2>
        <ul style={{margin:0, paddingLeft:18, color:"var(--sl-muted)"}}>
          <li>Unified profile with metrics and milestones for athletes</li>
          <li>Coach and parent views that stay in sync</li>
          <li>Clean dashboards, no clutter</li>
          <li>Links to social media and video in one place</li>
          <li>Direct communication between coaches and athletes</li>
          <li>Team Admin ability to give insights and help athletes keep profiles up to date</li>
        </ul>
      </div>
    </div>
  );
}
