import Link from "next/link";
import { ArrowUpRight, Bell, HandCoins, UserPlus } from "lucide-react";
import { Feedback, EmptyState } from "@/components/feedback";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profileResult, summaryResult, recentTransactionsResult, noticeResult] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_financial_summary", {}),
    supabase.from("transactions").select("id, transaction_type, amount, donor_or_recipient, transaction_date").order("created_at", { ascending: false }).limit(8),
    supabase.from("notices").select("id, title, content, created_at, author_id").order("created_at", { ascending: false }).limit(5),
  ]);
  if (profileResult.error || summaryResult.error || recentTransactionsResult.error || noticeResult.error) {
    console.error("Dashboard data query failed:", profileResult.error, summaryResult.error, recentTransactionsResult.error, noticeResult.error);
  }
  const profile = profileResult.data;
  const transactions = recentTransactionsResult.data ?? [];
  const totals = summaryResult.data?.[0];
  const isAdmin = profile?.role === "ADMIN";
  const membersResult = isAdmin ? await supabase.from("profiles").select("id, role, is_active") : null;
  if (membersResult?.error) console.error("Dashboard member count failed:", membersResult.error);
  const committeeCount = membersResult?.data?.filter((item) => item.role === "COMMITTEE").length ?? 0;
  const authorIds = [...new Set((noticeResult.data ?? []).map((item) => item.author_id))];
  const authorsResult = authorIds.length ? await supabase.from("public_profiles").select("id, full_name").in("id", authorIds) : { data: [], error: null };
  if (authorsResult.error) console.error("Notice author lookup failed:", authorsResult.error);
  const authors = new Map((authorsResult.data ?? []).map((item) => [item.id, item.full_name]));

  return (
    <>
      <div className="dashboard-title">
        <div><h1>{isAdmin ? "অ্যাডমিন ড্যাশবোর্ড" : "সদস্য ড্যাশবোর্ড"}</h1><p>স্বাগতম, {profile?.full_name ?? "সদস্য"}। ফাউন্ডেশনের সর্বশেষ তথ্য দেখুন।</p></div>
      </div>
      <Feedback status={status} />
      <section className="dashboard-cards" aria-label="আর্থিক সারসংক্ষেপ">
        <article className="dashboard-card"><span>মোট ফান্ড</span><strong>{formatCurrency(summaryResult.error || !totals ? null : Number(totals.income_total))}</strong></article>
        <article className="dashboard-card"><span>মোট খরচ</span><strong>{formatCurrency(summaryResult.error || !totals ? null : Number(totals.expense_total))}</strong></article>
        <article className="dashboard-card"><span>বর্তমান ব্যালেন্স</span><strong>{formatCurrency(summaryResult.error || !totals ? null : Number(totals.current_balance))}</strong></article>
        {isAdmin && <>
          <article className="dashboard-card"><span>মোট সদস্য</span><strong>{membersResult?.error ? "—" : (membersResult?.data?.length ?? 0).toLocaleString("bn-BD")}</strong></article>
          <article className="dashboard-card"><span>কমিটির সদস্য</span><strong>{membersResult?.error ? "—" : committeeCount.toLocaleString("bn-BD")}</strong></article>
        </>}
      </section>

      {isAdmin && <section className="dashboard-quick" aria-label="দ্রুত কাজ">
        <Link href="/dashboard/transactions"><HandCoins size={17} /> জমা/খরচ যোগ করুন</Link>
        <Link href="/dashboard/notices"><Bell size={17} /> নতুন নোটিশ</Link>
        <Link href="/dashboard/members"><UserPlus size={17} /> সদস্য পরিচালনা করুন</Link>
        <Link href="/dashboard/committee"><ArrowUpRight size={17} /> বর্তমান কমিটি পরিচালনা করুন</Link>
        <Link href="/dashboard/reports"><ArrowUpRight size={17} /> রিপোর্ট দেখুন</Link>
      </section>}
      {profile?.role === "COMMITTEE" && <section className="dashboard-quick"><Link href="/dashboard/notices"><Bell size={17} /> নতুন নোটিশ প্রকাশ করুন</Link></section>}

      <section className="panel">
        <div className="panel-header"><h2>সাম্প্রতিক লেনদেন</h2><Link className="text-link" href="/dashboard/transactions">সব লেনদেন <ArrowUpRight size={15} /></Link></div>
        {recentTransactionsResult.error ? <EmptyState>লেনদেন লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : transactions.length ? <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>ধরন</th><th>নাম</th><th>তারিখ</th><th>টাকার পরিমাণ</th></tr></thead>
          <tbody>{transactions.slice(0, 5).map((item) => <tr key={item.id}><td>{item.transaction_type === "INCOME" ? "জমা" : "খরচ"}</td><td>{item.donor_or_recipient}</td><td>{formatDate(item.transaction_date)}</td><td>{formatCurrency(Number(item.amount))}</td></tr>)}</tbody>
        </table></div> : <EmptyState>এখনও কোনো লেনদেনের তথ্য পাওয়া যায়নি।</EmptyState>}
      </section>

      <section className="panel">
        <div className="panel-header"><h2>সাম্প্রতিক নোটিশ</h2><Link className="text-link" href="/dashboard/notices">সব নোটিশ <ArrowUpRight size={15} /></Link></div>
        {noticeResult.error ? <EmptyState>নোটিশ লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : (noticeResult.data ?? []).length ? (noticeResult.data ?? []).map((item) => <article className="notice-detail" key={item.id}><span className="notice-card__date">{formatDate(item.created_at)} · {authors.get(item.author_id) ?? "ফাউন্ডেশন"}</span><h3>{item.title}</h3><p>{item.content}</p></article>) : <EmptyState>এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</EmptyState>}
      </section>
    </>
  );
}
