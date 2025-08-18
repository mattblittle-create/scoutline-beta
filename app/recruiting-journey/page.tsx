// app/recruiting-journey/page.tsx
import RecruitingJourneyHero from "../components/RecruitingJourneyHero";
import Link from "next/link";

export default function RecruitingJourneyPage() {
  return (
    <>
      <RecruitingJourneyHero />

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 16px",
          color: "#0f172a",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.15 }}>
          Recruiting Checklist
        </h1>

        {/* Light divider line */}
        <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 20px" }} />

        {/* Section 1 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>1) Start here</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>
              Create your account and choose a plan.{" "}
              <Link href="/pricing" style={{ color: "#0f172a", textDecoration: "underline" }}>
                Get started
              </Link>
              .
            </li>
            <li>
              Explore programs you’re interested in with{" "}
              <Link href="/search" style={{ color: "#0f172a", textDecoration: "underline" }}>
                Search
              </Link>
              . Filter by state, division, conference, or name.
            </li>
            <li>Set a realistic target list (e.g., 5 reach, 10 match, 10 safety).</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>2) Build your profile</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>Add bio (grad year, position(s), height/weight, handedness).</li>
            <li>Upload a clear headshot and action photo.</li>
            <li>Embed highlight reels (YouTube/Vimeo) and best game clips.</li>
            <li>Enter verified metrics (e.g., 60-yard, pop time, exit velo) and update often.</li>
            <li>Add academics: GPA, test scores (if any), intended major(s).</li>
            <li>List teams, showcases, awards, and coach contacts.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>3) Optimize for coaches</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>Lead with your best clip; keep videos short and labeled (date, opponent, context).</li>
            <li>Use clear titles: “2026 C — 1.95–2.05 pop — Summer ’25 highlights”.</li>
            <li>Keep stats current; add context (league level, innings, role).</li>
            <li>Ask a coach to review your profile for clarity and credibility.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>4) Use ScoutLine weekly</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>Update metrics, clips, and recent games.</li>
            <li>Track tasks: emails sent, camps to attend, questionnaires completed.</li>
            <li>Log coach interactions and follow-up dates.</li>
            <li>Adjust your target list as interests evolve.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>5) Communicate with coaches</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>
              Send concise intros: who you are, grad year/position, key measurables, GPA, and link
              to your ScoutLine profile.
            </li>
            <li>Personalize messages (why their program, fit with your goals).</li>
            <li>Share schedule links and upcoming events; follow up after good outings.</li>
            <li>Complete each program’s recruiting questionnaire (find links in{" "}
              <Link href="/search" style={{ color: "#0f172a", textDecoration: "underline" }}>
                Search
              </Link>
              ).
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>6) Eligibility & compliance</h2>
          <p style={{ color: "#475569", lineHeight: 1.65 }}>
            Register with the NCAA Eligibility Center early and keep transcripts/testing current.{" "}
            <a
              href="https://www.ncaa.org/student-athletes/future/eligibility-center"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0f172a", textDecoration: "underline" }}
            >
              NCAA Eligibility Center
            </a>
            .
          </p>
          <ul style={{ margin: "10px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>Know contact rules, quiet periods, and allowable communication windows.</li>
            <li>Confirm amateur status and core-course requirements with your counselor.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>7) Camps & visits</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>
              Prioritize camps where there’s real mutual interest; track them in{" "}
              <Link href="/search" style={{ color: "#0f172a", textDecoration: "underline" }}>
                Search
              </Link>{" "}
              (camp links appear on many program cards).
            </li>
            <li>Be ready with updated metrics/video before attending.</li>
            <li>Send a short pre-camp note; follow up with a thank-you + highlight link.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>8) Financial planning</h2>
          <ul style={{ margin: "8px 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
            <li>
              Review tuition ranges and scholarship types on program cards in{" "}
              <Link href="/search" style={{ color: "#0f172a", textDecoration: "underline" }}>
                Search
              </Link>
              .
            </li>
            <li>Ask each program about academic vs. athletic aid and stackable options.</li>
            <li>Build a simple budget (tuition, travel, equipment, showcases).</li>
          </ul>
        </section>

        {/* Bottom divider + quick links */}
        <div style={{ height: 1, background: "#e5e7eb", margin: "24px 0 16px" }} />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/search"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.96)",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid #e5e7eb",
              fontWeight: 600,
            }}
          >
            Explore Programs
          </Link>
          <Link
            href="/pricing"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#ca9a3f",
              color: "#1a1203",
              textDecoration: "none",
              border: "1px solid transparent",
              fontWeight: 700,
            }}
          >
            Build Your Profile
          </Link>
          <a
            href="https://www.ncaa.org/student-athletes/future/eligibility-center"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.96)",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid #e5e7eb",
              fontWeight: 600,
            }}
          >
            NCAA Eligibility Center
          </a>
        </div>
      </main>
    </>
  );
}
