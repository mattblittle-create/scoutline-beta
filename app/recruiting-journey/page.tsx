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
          padding: "32px 16px 110px", // bottom padding so floating bar won't overlap content
          color: "#0f172a",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.15 }}>
          Recruiting Checklist
        </h1>

        {/* Light divider line */}
        <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 20px" }} />

        {/* Collapsible styles + floating bar styles */}
        <style>{`
          details {
            border-radius: 10px;
            background: #fff;
            border: 1px solid #e5e7eb;
            margin: 0 0 14px;
          }
          summary {
            list-style: none;
            cursor: pointer;
            padding: 12px 14px;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            user-select: none;
          }
          /* custom caret */
          summary::before {
            content: "▸";
            display: inline-block;
            transition: transform .2s ease;
            transform-origin: center;
            font-size: 16px;
            color: #334155;
          }
          details[open] summary::before {
            transform: rotate(90deg);
          }
          /* remove default marker for Safari */
          summary::-webkit-details-marker { display: none; }

          .panel-body {
            padding: 0 16px 14px 16px;
          }

          /* Plain section (no box) for #6 */
          .plain { 
            background: transparent; 
            border: none; 
            margin: 0 0 14px;
          }
          .plain summary {
            padding-left: 0;
          }
          .plain .panel-body { 
            padding-left: 0; 
          }

          /* Floating action bar (bottom fixed) */
          .sl-fab {
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            bottom: 16px;
            z-index: 50;
            background: rgba(255,255,255,0.9);
            backdrop-filter: saturate(180%) blur(6px);
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            box-shadow: 0 12px 28px rgba(15,23,42,0.12);
            padding: 10px;
          }
          .sl-fab-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
          }
          .sl-btn-white {
            padding: 10px 16px;
            border-radius: 10px;
            background: rgba(255,255,255,0.96);
            color: #0f172a;
            text-decoration: none;
            border: 1px solid #e5e7eb;
            font-weight: 600;
            transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
          }
          .sl-btn-white:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.18);
            background: #f3f4f6;
          }
          .sl-btn-gold {
            padding: 10px 16px;
            border-radius: 10px;
            background: #ca9a3f;
            color: #1a1203;
            text-decoration: none;
            border: 1px solid transparent;
            font-weight: 700;
            transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
          }
          .sl-btn-gold:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.20);
            background: #b88934;
          }

          @media (max-width: 480px) {
            .sl-fab { 
              width: calc(100% - 16px);
              padding: 8px;
            }
          }
        `}</style>

        {/* 1) Start Here (collapsed by default) */}
        <details>
          <summary>1) Start Here</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
              <li>
                Create your account and choose a plan.{" "}
                <Link href="/pricing" style={{ color: "#0f172a", textDecoration: "underline" }}>
                  Get Started
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
          </div>
        </details>

        {/* 2) Build Your Profile */}
        <details>
          <summary>2) Build Your Profile</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
              <li>Add bio (grad year, position(s), height/weight, handedness).</li>
              <li>Upload a clear headshot and action photo.</li>
              <li>Embed highlight reels (YouTube/Vimeo) and best game clips.</li>
              <li>Enter verified metrics (e.g., 60-yard, pop time, exit velo) and update often.</li>
              <li>Add academics: GPA, test scores (if any), intended major(s).</li>
              <li>List teams, showcases, awards, and coach contacts.</li>
            </ul>
          </div>
        </details>

        {/* 3) Optimize for Coaches */}
        <details>
          <summary>3) Optimize for Coaches</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
              <li>Lead with your best clip; keep videos short and labeled (date, opponent, context).</li>
              <li>Use clear titles: “2026 C — 1.95–2.05 pop — Summer ’25 highlights”.</li>
              <li>Keep stats current; add context (league level, innings, role).</li>
              <li>Ask a coach to review your profile for clarity and credibility.</li>
            </ul>
          </div>
        </details>

        {/* 4) Use ScoutLine Weekly */}
        <details>
          <summary>4) Use ScoutLine Weekly</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
              <li>Update metrics, clips, and recent games.</li>
              <li>Track tasks: emails sent, camps to attend, questionnaires completed.</li>
              <li>Log coach interactions and follow-up dates.</li>
              <li>Adjust your target list as interests evolve.</li>
            </ul>
          </div>
        </details>

        {/* 5) Communicate with Coaches */}
        <details>
          <summary>5) Communicate with Coaches</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
              <li>
                Send concise intros: who you are, grad year/position, key measurables, GPA, and link
                to your ScoutLine profile.
              </li>
              <li>Personalize messages (why their program, fit with your goals).</li>
              <li>Share schedule links and upcoming events; follow up after good outings.</li>
              <li>
                Complete each program’s recruiting questionnaire (find links in{" "}
                <Link href="/search" style={{ color: "#0f172a", textDecoration: "underline" }}>
                  Search
                </Link>
                ).
              </li>
            </ul>
          </div>
        </details>

        {/* 6) Eligibility and Compliance — now same border style */}
        <details>
          <summary>6) Eligibility and Compliance</summary>
          <div className="panel-body">
            <p style={{ color: "#475569", lineHeight: 1.65, marginTop: 0 }}>
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
          </div>
        </details>

        {/* 7) Camps and Visits */}
        <details>
          <summary>7) Camps and Visits</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
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
          </div>
        </details>

        {/* 8) Financial Planning */}
        <details>
          <summary>8) Financial Planning</summary>
          <div className="panel-body">
            <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
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
          </div>
        </details>

      {/* Floating Action Bar */}
      <div className="sl-fab" role="region" aria-label="Quick actions">
        <div className="sl-fab-row">
          <Link href="/search" className="sl-btn-white">
            Explore Programs
          </Link>
          <Link href="/pricing" className="sl-btn-gold">
            Build Your Profile
          </Link>
          <a
            href="https://web3.ncaa.org/ecwr3/"
            target="_blank"
            rel="noopener noreferrer"
            className="sl-btn-white"
          >
            NCAA Eligibility Center
          </a>
        </div>
      </div>
    </>
  );
}
