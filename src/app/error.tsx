"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-main reset-shell">
      <section className="auth-card">
        <div className="auth-card__top">
          <h2>দুঃখিত, একটি সমস্যা হয়েছে।</h2>
          <p>আবার চেষ্টা করুন। সমস্যা চলতে থাকলে পরে ফিরে আসুন।</p>
        </div>
        <button className="button button--gold" type="button" onClick={reset}>আবার চেষ্টা করুন</button>
      </section>
    </main>
  );
}
