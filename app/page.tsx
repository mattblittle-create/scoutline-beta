import HeroBanner from "./components/HeroBanner";

export default function HomePage() {
  return (
    <>
      <HeroBanner />

      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <span className="badge">Beta</span>

        <h1 className="mt-2 text-3xl md:text-4xl font-semibold">
          Your recruiting journey, organized and in your control.
        </h1>

        <p className="mt-3 text-slate-600 max-w-[720px]">
          ScoutLine brings your entire recruiting journey into one place—contacts,
          timelines, tasks, and progress—so you spend less time guessing and more time advancing.
        </p>

        <div className="mt-4 flex gap-3">
          <a className="btn btn-primary" href="/pricing">Get Started</a>
          <a className="btn" href="/recruiting-journey">See how it works</a>
        </div>

        <section className="card mt-8">
          <h2 className="mt-0">Why ScoutLine</h2>
          <ul className="list-disc pl-5 text-slate-600">
            <li>Unified profile & milestones across sports</li>
            <li>Coach & parent views that stay in sync</li>
            <li>Clean dashboards, not clutter</li>
          </ul>
        </section>
      </main>
    </>
  );
}
