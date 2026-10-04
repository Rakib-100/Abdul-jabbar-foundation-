import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-main reset-shell">
      <section className="auth-card">
        <div className="auth-card__top">
          <span className="eyebrow eyebrow--muted">পাতাটি পাওয়া যায়নি</span>
          <h2>এই ঠিকানায় কোনো পাতা নেই</h2>
          <p>ঠিকানাটি যাচাই করুন অথবা মূল পাতায় ফিরে যান।</p>
        </div>
        <Link className="button button--gold" href="/">মূল পাতায় ফিরুন</Link>
      </section>
    </main>
  );
}
