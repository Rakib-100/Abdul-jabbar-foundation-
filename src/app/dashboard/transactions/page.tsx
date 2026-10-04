import type { Metadata } from "next";
import { Feedback, EmptyState } from "@/components/feedback";
import { addCategory, addTransaction, updateTransaction } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TransactionType } from "@/types/database";

export const metadata: Metadata = { title: "লেনদেন" };

const typeLabels: Record<TransactionType, string> = { INCOME: "জমা", EXPENSE: "খরচ" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profileResult, categoriesResult, transactionsResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("transaction_categories").select("id, name, type").eq("is_active", true).order("name"),
    supabase.from("transactions").select("id, transaction_type, amount, donor_or_recipient, description, transaction_date, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (profileResult.error || categoriesResult.error || transactionsResult.error) console.error("Transactions page query failed:", profileResult.error, categoriesResult.error, transactionsResult.error);
  const isAdmin = profileResult.data?.role === "ADMIN";
  const categories = categoriesResult.data ?? [];
  const transactions = transactionsResult.data ?? [];

  return (
    <>
      <div className="dashboard-title"><div><h1>লেনদেনের তথ্য</h1><p>জমা, খরচ ও প্রতিটি লেনদেনের কারণ দেখুন।</p></div></div>
      <Feedback status={status} />
      {isAdmin && <section className="panel">
        <h2>নতুন লেনদেন যোগ করুন</h2>
        <form className="stacked-form" action={addTransaction}>
          <div className="form-row">
            <div className="field"><label htmlFor="transaction_type">লেনদেনের ধরন</label><select id="transaction_type" name="transaction_type" defaultValue="INCOME"><option value="INCOME">জমা</option><option value="EXPENSE">খরচ</option></select></div>
            <div className="field"><label htmlFor="amount">টাকার পরিমাণ</label><input id="amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="টাকার পরিমাণ লিখুন" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="category_id">খাত</label><select id="category_id" name="category_id" required defaultValue=""><option value="" disabled>খাত নির্বাচন করুন</option>{categories.map((category) => <option key={category.id} value={category.id}>{typeLabels[category.type]} · {category.name}</option>)}</select></div>
            <div className="field"><label htmlFor="donor_or_recipient">দাতা / যাকে দেওয়া হয়েছে</label><input id="donor_or_recipient" name="donor_or_recipient" required placeholder="নাম লিখুন" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="transaction_date">তারিখ</label><input id="transaction_date" name="transaction_date" type="date" /></div>
            <div className="field"><label htmlFor="description">লেনদেনের তথ্য / মন্তব্য</label><textarea id="description" name="description" required minLength={3} maxLength={500} rows={3} placeholder="কেন টাকা জমা বা খরচ হচ্ছে তা লিখুন" /></div>
          </div>
          <button className="button button--gold" type="submit">লেনদেন সংরক্ষণ করুন</button>
        </form>
      </section>}
      {isAdmin && <section className="panel">
        <h2>নতুন খরচ/জমার খাত যোগ করুন</h2>
        <form className="form-inline" action={addCategory}>
          <div className="field"><label htmlFor="category-name">খাতের নাম</label><input id="category-name" name="name" required placeholder="নতুন খাতের নাম" /></div>
          <div className="field"><label htmlFor="category-type">খাতের ধরন</label><select id="category-type" name="type" defaultValue="EXPENSE"><option value="INCOME">জমা</option><option value="EXPENSE">খরচ</option></select></div>
          <button className="button button--gold" type="submit">খাত যোগ করুন</button>
        </form>
      </section>}
      <section className="panel">
        <h2>লেনদেনের তালিকা ও তথ্য</h2>
        {transactionsResult.error ? <EmptyState>লেনদেন লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : transactions.length ? <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>ধরন</th><th>নাম</th><th>তারিখ</th><th>টাকার পরিমাণ</th><th>লেনদেনের তথ্য</th>{isAdmin && <th>পরিবর্তন</th>}</tr></thead>
          <tbody>{transactions.map((item) => <tr key={item.id}>
            <td>{typeLabels[item.transaction_type]}</td><td>{item.donor_or_recipient}</td><td>{formatDate(item.transaction_date)}</td><td>{formatCurrency(Number(item.amount))}</td><td>{item.description || "—"}</td>
            {isAdmin && <td><details><summary className="table-action">সম্পাদনা</summary><form className="stacked-form" action={updateTransaction}>
              <input type="hidden" name="id" value={item.id} />
              <label className="field"><span>টাকার পরিমাণ</span><input name="amount" type="number" min="0.01" step="0.01" defaultValue={item.amount} required /></label>
              <label className="field"><span>দাতা / গ্রহীতা</span><input name="donor_or_recipient" defaultValue={item.donor_or_recipient} required /></label>
              <label className="field"><span>তারিখ</span><input name="transaction_date" type="date" defaultValue={item.transaction_date ?? ""} /></label>
              <label className="field"><span>সংশোধনের কারণ / নতুন মন্তব্য</span><textarea name="description" required minLength={3} maxLength={500} rows={3} placeholder="এই সংশোধনের কারণ লিখুন" /></label>
              <button className="table-action" type="submit">পরিবর্তন সংরক্ষণ করুন</button>
            </form></details></td>}
          </tr>)}</tbody>
        </table></div> : <EmptyState>এখনও কোনো লেনদেনের তথ্য পাওয়া যায়নি।</EmptyState>}
      </section>
    </>
  );
}
