"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="sl-login">
      <style>{`
        .sl-login { max-width:400px; margin:80px auto; padding:24px; border:1px solid var(--sl-border); border-radius:12px; box-shadow: var(--sl-shadow); background:#fff; }
        .sl-login h1 { font-size:1.6rem; margin-bottom:16px; text-align:center; }
        .sl-field { display:flex; flex-direction:column; margin-bottom:16px; }
        .sl-field label { font-weight:600; margin-bottom:4px; }
        .sl-input { border:1px solid var(--sl-border); border-radius:8px; padding:10px; font-size:1rem; }
        .sl-help { font-size:0.85rem; color:#6b7280; margin-top:4px; }
        .sl-links { display:flex; justify-content:space-between; margin-top:12px; }
        .sl-links a { font-size:0.9rem; color:var(--sl-accent); }
        .sl-links a:hover { text-decoration:underline; }
        .sl-submit { margin-top:24px; background:var(--sl-accent); color:#fff; border:none; border-radius:8px; padding:10px 16px; cursor:pointer; width:100%; font-size:1rem; font-weight:600; transition:background .2s; }
        .sl-submit:hover { background: #d1a300; } /* darker gold */
      `}</style>

      <h1>Log In</h1>

      <form>
        <div className="sl-field">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" className="sl-input" />
        </div>

        <div className="sl-links">
          <Link href="/forgot-password">Forgot Password?</Link>
        </div>

        <button type="submit" className="sl-submit">Log In</button>
      </form>
    </main>
  );
}
