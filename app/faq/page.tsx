"use client";

import React, { useState } from "react";
import Link from "next/link";

/**
 * FAQ Page
 * - Hero image: /baseballonground.jpg  (from scoutline-beta/public/baseballonground.jpg)
 * - H1: 'Frequently Asked Questions'
 * - Subtext: 'You have questions. We have answers.'
 * - Buttons sit at the bottom of the hero, matching your standard .sl-link-btn hover/lift/underline
 * - Sections are labeled boxes; each expands to show its Q&A items (accordion style)
 * - Colors/spacing echo your site tokens used elsewhere (#0f172a, #64748b, #e5e7eb)
 */

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; items: QA[] };

const sections: Section[] = [
  // About ScoutLine
  {
    title: "About ScoutLine",
    items: [
      {
        q: "What is ScoutLine?",
        a: (
          <>
            ScoutLine is a recruiting platform that combines player info, verified player metrics, video, and
            progress tracking into a searchable database used by college coaches and scouts. 
          </>
        ),
      },
      {
        q: "Who is ScoutLine for?",
        a: (
          <>
            ScoutLine is designed for high school athletes, parents, and organizations who want a simple way
            to showcase skills to college programs. College coaches also use it to discover and track recruits.
            
          </>
        ),
      },
      {
        q: "How is ScoutLine different from other recruiting sites?",
        a: (
          <>
            ScoutLine emphasizes verified data and development tracking over time. Players update their metrics
            and video regularly, so coaches see growth, not just one snapshot. 
          </>
        ),
      },
      {
        q: "What sports is ScoutLine for?",
        a: (
          <>
            ScoutLine is designed to work best for high school baseball players wanting to play college baseball.
            However, ScoutLine could be used to help an athlete from any sport get recruited. If you are a high school
            athlete looking to play in college in a sport other than baseball, email support@scoutline.com and tell us
            about your needs. We will do our best to help you get seen. Allow 24 to 48 hours for a response.
            
          </>
        ),
      },
    ],
  },

  // Player Profiles
  {
    title: "Player Profiles",
    items: [
      {
        q: "What goes into a player profile?",
        a: (
          <>
            Player info (name, location, positions, teams, etc.), verified metrics (exit velocity, 60-yard dash,
            pitching velo, etc.), metric data graphed over time, highlight videos, academic info, and recruiting
            status (committed / uncommitted). 
          </>
        ),
      },
      {
        q: "Can I update my profile after it’s created?",
        a: (
          <>
            Yes, players can update their profile anytime. Updates are visible to college coaches in real-time.
            
          </>
        ),
      },
      {
        q: "How do commitments work on ScoutLine?",
        a: (
          <>
            Players can mark themselves as “Committed” and add their college. A gold star and “COMMITTED” badge
            will appear on their profile thumbnail and expanded view. 
          </>
        ),
      },
      {
        q: "Who verifies the metrics?",
        a: (
          <>
            Metrics recorded during data sessions (individual training using Trackman, Rapsodo, etc.) or other approved
            partner software’s and events are tagged as “Verified.” Players can also input self-reported stats, which
            are labeled accordingly. 
          </>
        ),
      },
      {
        q: "Can I share my profile on social media?",
        a: (
          <>
            Yes. Each profile has a unique link you can share directly with coaches or post on social platforms like X
            and Instagram. 
          </>
        ),
      },
      {
        q: "Why am I getting ads?",
        a: (
          <>
            Players who choose to be on the Basic or free plan can receive advertising. To remove ads, choose one of our
            other plans. 
          </>
        ),
      },
    ],
  },

  // For College Coaches and Recruiters
  {
    title: "For College Coaches & Recruiters",
    items: [
      {
        q: "How do coaches use ScoutLine?",
        a: (
          <>
            Coaches can filter players by position, grad year, metrics, academic criteria, and recruiting status. Verified
            video and metrics make it easier to evaluate prospects remotely. 
          </>
        ),
      },
      {
        q: "Do coaches have to pay to access ScoutLine?",
        a: <>No. College coaches are granted free access to ScoutLine. </>,
      },
      {
        q: "Can coaches download reports or rosters?",
        a: (
          <>
            Yes. Coaches can export filtered player lists or save players to a “watchlist” for easy follow-up.
            
          </>
        ),
      },
      {
        q: "How do I know metrics are accurate?",
        a: (
          <>
            Verified stats are marked as such. Non-verified entries are clearly labeled so coaches know the source.
            
          </>
        ),
      },
    ],
  },

  // For Parents
  {
    title: "For Parents",
    items: [
      {
        q: "How involved should I be in my child’s recruiting process?",
        a: (
          <>
            Parents play an important support role, but coaches want to hear directly from players. We recommend helping
            your child stay organized, reviewing communication before it’s sent, and encouraging them to take the lead
            when talking with coaches. 
          </>
        ),
      },
      {
        q: "Can parents manage player profiles?",
        a: (
          <>
            Yes. Parents can have account access to help update academic info, video uploads, or subscription settings.
            Players still control their own recruiting voice. 
          </>
        ),
      },
      {
        q: "Will coaches be contacting me or my child?",
        a: (
          <>
            Most recruiting communication goes directly to the player. However, parents may be included in official emails,
            calls, or campus visits — especially as decisions get closer. 
          </>
        ),
      },
      {
        q: "How do I know if the information on ScoutLine is safe?",
        a: (
          <>
            All personal data is encrypted, and profiles are only accessible to verified college coaches and recruiters.
            Parents always control what academic and contact information is visible. 
          </>
        ),
      },
      {
        q: "What if my child hasn’t received interest yet?",
        a: (
          <>
            Recruiting is a process. College interest depends on player skill, academics, and roster needs. Consistently
            updating metrics and video, plus attending events, will maximize visibility. 
          </>
        ),
      },
      {
        q: "Do parents have to pay for ScoutLine?",
        a: (
          <>
            Basic player profiles are free. Paid tiers unlock extra features like expanded video hosting, deeper analytics,
            and priority coach access. 
          </>
        ),
      },
      {
        q: "Can ScoutLine guarantee my child a scholarship?",
        a: (
          <>
            No platform can guarantee offers or scholarships. ScoutLine provides exposure, verified data, and tools that
            increase a player’s chances of connecting with the right program. 
          </>
        ),
      },
    ],
  },

  // Video & Metrics
  {
    title: "Video & Metrics",
    items: [
      {
        q: "What kind of video should I upload?",
        a: (
          <>
            Highlight clips, live game footage, skills videos, and verified workout recordings. Keep videos short and clear
            — most coaches prefer 2–3 minutes. 
          </>
        ),
      },
      {
        q: "Is video required?",
        a: (
          <>
            It’s optional but strongly recommended. Coaches value seeing mechanics and skills in addition to numbers.
            
          </>
        ),
      },
      {
        q: "How often should I update my metrics?",
        a: (
          <>
            As often as you improve. Frequent updates help show growth and progression, which coaches look for.
            
          </>
        ),
      },
      {
        q: "Can I include data from third-party tools?",
        a: (
          <>
            Yes. You can upload pitching and hitting results from trusted tracking systems like Rapsodo or Trackman.
            
          </>
        ),
      },
    ],
  },

  // Pricing & Access
  {
    title: "Pricing & Access",
    items: [
      {
        q: "Is ScoutLine free for players?",
        a: (
          <>
            Basic profiles are free to create. To get the full use of ScoutLine (public profile, communication, videos,
            metric tracking, etc.), players do need to choose a subscription plan level. 
          </>
        ),
      },
      {
        q: "Will there be different subscription levels?",
        a: (
          <>
            Yes, players and families can choose between a free basic profile or upgraded tiers with added video,
            analytics, and exposure features. 
          </>
        ),
      },
      {
        q: "How do I access my ScoutLine account and profile?",
        a: (
          <>
            Full login and access steps for players, coaches/recruiters, and team administrators — including adding a
            parent email and how team admins invite players — as detailed in your document. 
          </>
        ),
      },
      {
        q: "What if I forget my username and/or password?",
        a: <>Use “Forgot Username” or “Forgot Password” on the login screen and follow the prompts. </>,
      },
      {
        q: "How do I cancel or change my subscription?",
        a: (
          <>
            You can adjust or cancel anytime from account settings. After canceling, your profile moves from public to
            private and is no longer searchable/viewable by coaches. 
          </>
        ),
      },
      {
        q: "Can I get a refund?",
        a: (
          <>
            Subscription fees are generally non-refundable once processed. If you experience a billing error or technical
            issue, contact support and we’ll work with you to make it right. You can cancel anytime to prevent future
            charges. We recommend starting with the free profile before upgrading. 
          </>
        ),
      },
      {
        q: "Why am I charged 3% when paying with a credit or debit card?",
        a: (
          <>
            The 3% charge is a regulated processing fee assessed by the card networks and our payment processor for card
            transactions. ScoutLine does not retain this fee — it’s passed through to cover the cost of card acceptance.
            You can avoid it by paying with ACH/bank transfer. 
          </>
        ),
      },
    ],
  },

  // Teams & Events
  {
    title: "Teams & Events",
    items: [
      {
        q: "Can travel or high school teams use ScoutLine?",
        a: (
          <>
            Yes. There is a Team Plan that lets organizations set up their team(s), give each registered player a profile,
            and optionally white‑label the dashboard as “Powered by ScoutLine.” 
          </>
        ),
      },
      {
        q: "Will ScoutLine integrate with showcase or camp data?",
        a: (
          <>
            Yes. When players attend partner events, results and videos can be synced directly into profiles.
            
          </>
        ),
      },
    ],
  },

  // Data & Privacy
  {
    title: "Data & Privacy",
    items: [
      {
        q: "Who can see my information?",
        a: (
          <>
            Only college coaches and verified recruiters have full access to your profile data, including contact info.
            Parents and players control which videos and details are public. 
          </>
        ),
      },
      {
        q: "How secure is my data?",
        a: (
          <>
            ScoutLine uses industry‑standard data encryption. Your personal info is never sold to third parties.
            
          </>
        ),
      },
      {
        q: "Can I remove my profile?",
        a: (
          <>
            Yes. Players or parents can move a profile to “Private” at any time, which removes searchability and public
            viewing. 
          </>
        ),
      },
    ],
  },

  // Contact
  {
    title: "Contact ScoutLine",
    items: [
      {
        q: "What if I have other questions or issues?",
        a: (
          <>
            You can contact the ScoutLine team at <a href="mailto:support@scoutline.com">support@scoutline.com</a>.
            Please allow 24–48 hours for a response. 
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main style={{ color: "#0f172a" }}>
      {/* HERO */}
      <section
        aria-label="FAQ hero"
        style={{
          position: "relative",
          minHeight: 440,
          width: "100%",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          borderBottom: "1px solid #e5e7eb",
          backgroundImage: `url('/baseballonground.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay for readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.48) 0%, rgba(15,23,42,0.28) 40%, rgba(15,23,42,0.48) 100%)",
          }}
        />
        {/* Top copy */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            padding: "0 16px",
            maxWidth: 1100,
            width: "100%",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontWeight: 700,
              lineHeight: 1.1,
              fontSize: "clamp(24px, 4.2vw, 44px)",
              color: "#e5e7eb",
            }}
          >
            Frequently Asked Questions
          </h1>
          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 740,
              lineHeight: 1.6,
              fontSize: "clamp(14px, 2.2vw, 18px)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            You have questions. We have answers.
          </p>
        </div>

        {/* Bottom buttons (match your standard buttons) */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            padding: "0 16px",
            width: "100%",
            maxWidth: 1100,
          }}
        >
          <Link href="/search" className="sl-link-btn">
            College Search
          </Link>
          <Link href="/pricing" className="sl-link-btn">
            Get Started
          </Link>
          <Link href="/login" className="sl-link-btn">
            Log In
          </Link>
        </div>
      </section>

      {/* CONTENT */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {sections.map((sec) => (
            <FAQSection key={sec.title} title={sec.title} items={sec.items} />
          ))}
        </div>
      </section>

      {/* Local styles for link buttons if not globally defined */}
      <style>{`
        .sl-link-btn {
          display: inline-block;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.96);
          color: #0f172a;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          font-weight: 700;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </main>
  );
}

function FAQSection({ title, items }: Section) {
  const [open, setOpen] = useState(false);

  return (
    <article
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
      }}
    >
      {/* Section header (click to expand) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "16px 16px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
          color: "#0f172a",
          fontSize: 18,
        }}
      >
        <span>{title}</span>
        <span
          aria-hidden
          style={{
            fontSize: 18,
            color: "#64748b",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: "#e5e7eb" }} />

      {/* Items */}
      {open && (
        <div style={{ padding: 12 }}>
          {items.map(({ q, a }, idx) => (
            <div
              key={idx}
              style={{
                padding: "12px 8px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: 16,
                  lineHeight: 1.3,
                  color: "#0f172a",
                }}
              >
                {q}
              </h3>
              <div style={{ color: "#334155", fontSize: 14, lineHeight: 1.5 }}>{a}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
