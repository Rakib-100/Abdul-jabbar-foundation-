import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/feedback";
import { getPublicFinancialReport } from "@/lib/public-data";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "আর্থিক হিসাব" };
export const revalidate = 60;

export default async function FinancialsPage() {
  const { stats, contributions, expenses, error } = await getPublicFinancialReport();
  return (
    <>
      <Header />
      <main className="section">
        <div className="container">
          <Link className="text-link" href="/"><ArrowLeft size={15} /> মূল পাতায় ফিরুন</Link>
          <div className="section-heading">
            <span className="eyebrow eyebrow--muted"><Landmark size={15} /> আর্থিক স্বচ্ছতা</span>
            <h1>আর্থিক হিসাব</h1>
            <p>জমা ও খরচের প্রতিটি হিসাব লেনদেনের তথ্য থেকে তৈরি। ব্যালেন্স নিজে থেকে গণনা হয়।</p>
          </div>
          {error && <p className="form-alert" role="status">{error}</p>}
          <div className="stats-grid">
            <article className="stat-card"><span className="stat-card__label">মোট ফান্ড সংগ্রহ</span><strong>{formatCurrency(stats?.income)}</strong><span className="stat-card__foot">সর্বমোট জমা</span></article>
            <article className="stat-card"><span className="stat-card__label">মোট খরচ</span><strong>{formatCurrency(stats?.expense)}</strong><span className="stat-card__foot">সেবামূলক কার্যক্রমে</span></article>
            <article className="stat-card stat-card--balance"><span className="stat-card__label">বর্তমান ব্যালেন্স</span><strong>{formatCurrency(stats?.balance)}</strong><span className="stat-card__foot">জমা থেকে খরচ বাদ দিয়ে</span></article>
          </div>
          <section className="panel">
            <h2>সদস্য/দাতাভিত্তিক অনুদানের হিসাব</h2>
            {error ? <EmptyState>আর্থিক তথ্য লোড করা যায়নি।</EmptyState> : contributions.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ক্রমিক</th><th>সদস্য/দাতার নাম</th><th>সর্বমোট জমা</th></tr></thead><tbody>{contributions.map((item, index) => <tr key={item.name}><td>{(index + 1).toLocaleString("bn-BD")}</td><td>{item.name}</td><td>{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div> : <EmptyState>এখনও কোনো অনুদানের তথ্য পাওয়া যায়নি।</EmptyState>}
          </section>
          <section className="panel">
            <h2>খাতভিত্তিক ব্যয়ের হিসাব</h2>
            {error ? <EmptyState>আর্থিক তথ্য লোড করা যায়নি।</EmptyState> : expenses.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ক্রমিক</th><th>ব্যয়ের খাত</th><th>গ্রহীতা</th><th>মোট খরচ</th></tr></thead><tbody>{expenses.map((item, index) => <tr key={`${item.category}-${item.recipient}`}><td>{(index + 1).toLocaleString("bn-BD")}</td><td>{item.category}</td><td>{item.recipient}</td><td>{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div> : <EmptyState>এখনও কোনো ব্যয়ের তথ্য পাওয়া যায়নি।</EmptyState>}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
