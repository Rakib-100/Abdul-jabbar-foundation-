import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { EmptyState } from "@/components/feedback";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import { getAllTransactions } from "@/lib/transactions";

export const metadata: Metadata = { title: "রিপোর্ট" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ শুরুর_তারিখ?: string; শেষের_তারিখ?: string }> }) {
  const { শুরুর_তারিখ: start = "", শেষের_তারিখ: end = "" } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "ADMIN") redirect("/dashboard?status=denied");

  const [transactionsResult, categoriesResult] = await Promise.all([
    getAllTransactions(supabase, start || undefined, end || undefined),
    supabase.from("transaction_categories").select("id, name"),
  ]);
  if (transactionsResult.error || categoriesResult.error) console.error("Reports query failed:", transactionsResult.error, categoriesResult.error);
  const transactions = transactionsResult.data ?? [];
  const categoryNames = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
  const income = transactions.filter((item) => item.transaction_type === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = transactions.filter((item) => item.transaction_type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);
  const contributionTotals = new Map<string, number>();
  const expenseTotals = new Map<string, number>();
  const monthlyTotals = new Map<string, { income: number; expense: number }>();
  for (const item of transactions) {
    if (item.transaction_type === "INCOME") contributionTotals.set(item.donor_or_recipient, (contributionTotals.get(item.donor_or_recipient) ?? 0) + Number(item.amount));
    if (item.transaction_type === "EXPENSE") {
      const key = categoryNames.get(item.category_id ?? "") ?? "অন্যান্য";
      expenseTotals.set(key, (expenseTotals.get(key) ?? 0) + Number(item.amount));
    }
    if (item.transaction_date) {
      const month = item.transaction_date.slice(0, 7);
      const value = monthlyTotals.get(month) ?? { income: 0, expense: 0 };
      if (item.transaction_type === "INCOME") value.income += Number(item.amount);
      else value.expense += Number(item.amount);
      monthlyTotals.set(month, value);
    }
  }
  const csvUrl = `/dashboard/reports/export?${new URLSearchParams({ start, end }).toString()}`;

  return (
    <>
      <div className="dashboard-title"><div><h1>রিপোর্ট</h1><p>আর্থিক লেনদেন ও সদস্যভিত্তিক হিসাব পর্যালোচনা করুন।</p></div></div>
      <section className="panel">
        <form className="report-toolbar" method="get">
          <div className="field"><label htmlFor="report-start">শুরুর তারিখ</label><input id="report-start" name="শুরুর_তারিখ" type="date" defaultValue={start} /></div>
          <div className="field"><label htmlFor="report-end">শেষের তারিখ</label><input id="report-end" name="শেষের_তারিখ" type="date" defaultValue={end} /></div>
          <button className="button button--gold" type="submit">রিপোর্ট দেখুন</button>
          <a className="button button--outline-light" href={csvUrl}><Download size={16} /> CSV ডাউনলোড করুন</a>
        </form>
        {(start || end) && <p className="field-hint">নির্বাচিত সময়ের রিপোর্টে তারিখবিহীন লেনদেন অন্তর্ভুক্ত নয়।</p>}
      </section>
      {transactionsResult.error || categoriesResult.error ? <EmptyState>রিপোর্ট লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : <>
        <section className="dashboard-cards">
          <article className="dashboard-card"><span>মোট জমা</span><strong>{formatCurrency(income)}</strong></article>
          <article className="dashboard-card"><span>মোট খরচ</span><strong>{formatCurrency(expense)}</strong></article>
          <article className="dashboard-card"><span>বর্তমান ব্যালেন্স</span><strong>{formatCurrency(income - expense)}</strong></article>
        </section>
        <section className="panel"><h2>সদস্যভিত্তিক অনুদান</h2>
          {contributionTotals.size ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ক্রমিক</th><th>সদস্য/দাতার নাম</th><th>সর্বমোট জমা</th></tr></thead><tbody>{[...contributionTotals].sort((a, b) => b[1] - a[1]).map(([name, amount], index) => <tr key={name}><td>{(index + 1).toLocaleString("bn-BD")}</td><td>{name}</td><td>{formatCurrency(amount)}</td></tr>)}</tbody></table></div> : <EmptyState>এখনও কোনো অনুদানের তথ্য পাওয়া যায়নি।</EmptyState>}
        </section>
        <section className="panel"><h2>খাতভিত্তিক ব্যয়ের হিসাব</h2>
          {expenseTotals.size ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ব্যয়ের খাত</th><th>মোট খরচ</th></tr></thead><tbody>{[...expenseTotals].sort((a, b) => b[1] - a[1]).map(([name, amount]) => <tr key={name}><td>{name}</td><td>{formatCurrency(amount)}</td></tr>)}</tbody></table></div> : <EmptyState>এখনও কোনো ব্যয়ের তথ্য পাওয়া যায়নি।</EmptyState>}
        </section>
        <section className="panel"><h2>মাসভিত্তিক জমা ও খরচ</h2>
          {monthlyTotals.size ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>মাস</th><th>মোট জমা</th><th>মোট খরচ</th></tr></thead><tbody>{[...monthlyTotals].sort((a, b) => b[0].localeCompare(a[0])).map(([month, totals]) => <tr key={month}><td>{formatDate(`${month}-01`)}</td><td>{formatCurrency(totals.income)}</td><td>{formatCurrency(totals.expense)}</td></tr>)}</tbody></table></div> : <EmptyState>তারিখসহ কোনো লেনদেন পাওয়া যায়নি।</EmptyState>}
        </section>
      </>}
    </>
  );
}
