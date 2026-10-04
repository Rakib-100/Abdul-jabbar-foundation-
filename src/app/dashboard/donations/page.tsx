import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, Feedback } from "@/components/feedback";
import { recordDonationSubmission, rejectDonationSubmission } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "অনুদানের আবেদন" };

export default async function DonationSubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error: accessError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (accessError) console.error("Donation management authorization lookup failed:", accessError);
  if (profile?.role !== "ADMIN") redirect("/dashboard?status=denied");

  const [submissionsResult, categoriesResult] = await Promise.all([
    supabase.from("donation_submissions")
      .select("id, donor_name, transaction_reference, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("transaction_categories").select("id, name").eq("type", "INCOME").eq("is_active", true).order("name"),
  ]);
  if (submissionsResult.error || categoriesResult.error) console.error("Donation submissions query failed:", submissionsResult.error, categoriesResult.error);
  const submissions = submissionsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const pending = submissions.filter((item) => item.status === "PENDING");

  return (
    <>
      <div className="dashboard-title">
        <div><h1>অনুদানের আবেদন</h1><p>বিকাশে পাঠানো টাকা যাচাই করে নিজে মূল হিসাবে যোগ করুন।</p></div>
        {pending.length > 0 && <span className="pending-counter">{pending.length.toLocaleString("bn-BD")}টি অপেক্ষমাণ</span>}
      </div>
      <Feedback status={status} />
      <div className="form-alert donation-admin-warning">ট্রানজেকশন আইডি বিকাশে যাচাই না করে কোনো আবেদন মূল হিসাবে যোগ করবেন না। আবেদন জমা পড়লেই হিসাবের মোট বা ব্যালেন্স বাড়ে না।</div>
      <section className="panel">
        <h2>যাচাইয়ের অপেক্ষায়</h2>
        {submissionsResult.error ? <EmptyState>অনুদানের আবেদন লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : pending.length ? pending.map((item) => (
          <article className="donation-review-card" key={item.id}>
            <div className="donation-review-card__summary">
              <div><span className="field-hint">{formatDate(item.created_at)}</span><h3>{item.donor_name}</h3><p>ট্রানজেকশন আইডি: <strong>{item.transaction_reference}</strong></p></div>
              <strong className="donation-review-card__amount">{formatCurrency(Number(item.amount))}</strong>
            </div>
            {categoriesResult.error ? <p className="field-hint">জমার খাত লোড করা যায়নি। পরে আবার চেষ্টা করুন।</p> : categories.length ? <div className="donation-review-card__actions">
              <form className="donation-record-form" action={recordDonationSubmission}>
                <input type="hidden" name="submission_id" value={item.id} />
                <div className="field"><label htmlFor={`category-${item.id}`}>যাচাইয়ের পর জমার খাত</label><select id={`category-${item.id}`} name="category_id" required defaultValue=""><option value="" disabled>জমার খাত নির্বাচন করুন</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div>
                <div className="field"><label htmlFor={`date-${item.id}`}>বিকাশে পাঠানোর তারিখ</label><input id={`date-${item.id}`} name="donation_date" type="date" /></div>
                <div className="field"><label htmlFor={`comment-${item.id}`}>লেনদেনের তথ্য / মন্তব্য</label><textarea id={`comment-${item.id}`} name="comment" required minLength={3} maxLength={500} rows={3} placeholder="যাচাই ও জমার কারণ লিখুন" /></div>
                <button className="button button--gold" type="submit">যাচাই করেছি — মূল হিসাবে যোগ করুন</button>
              </form>
              <form action={rejectDonationSubmission}>
                <input type="hidden" name="submission_id" value={item.id} />
                <ConfirmSubmit message="যাচাই করা অনুদানের আবেদনটি বাতিল হিসেবে চিহ্নিত করবেন?">বাতিল হিসেবে চিহ্নিত করুন</ConfirmSubmit>
              </form>
            </div> : <p className="form-alert">জমার কোনো সক্রিয় খাত নেই। আগে লেনদেন পাতায় জমার খাত যোগ করুন।</p>}
          </article>
        )) : <EmptyState>নতুন কোনো অনুদানের আবেদন নেই।</EmptyState>}
      </section>
      <section className="panel">
        <h2>সাম্প্রতিক আবেদন</h2>
        {submissionsResult.error ? <EmptyState>আবেদনের ইতিহাস লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : submissions.length ? <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>তারিখ</th><th>দাতার নাম</th><th>ট্রানজেকশন আইডি</th><th>পরিমাণ</th><th>অবস্থা</th></tr></thead>
          <tbody>{submissions.map((item) => <tr key={item.id}><td>{formatDate(item.created_at)}</td><td>{item.donor_name}</td><td>{item.transaction_reference}</td><td>{formatCurrency(Number(item.amount))}</td><td><span className={`pill${item.status === "PENDING" ? " pill--pending" : item.status === "REJECTED" ? " pill--inactive" : ""}`}>{item.status === "PENDING" ? "যাচাই বাকি" : item.status === "RECORDED" ? "হিসাবে যোগ হয়েছে" : "বাতিল"}</span></td></tr>)}</tbody>
        </table></div> : <EmptyState>এখনও কোনো অনুদানের আবেদন পাওয়া যায়নি।</EmptyState>}
      </section>
    </>
  );
}
