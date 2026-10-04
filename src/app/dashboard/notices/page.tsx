import type { Metadata } from "next";
import Image from "next/image";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, Feedback } from "@/components/feedback";
import { addNotice, deleteNotice, toggleNoticePin, updateNotice } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "নোটিশ বোর্ড" };

export default async function DashboardNoticesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profileResult, noticesResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("notices").select("id, title, content, image_url, author_id, is_pinned, created_at").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (profileResult.error || noticesResult.error) console.error("Notice management query failed:", profileResult.error, noticesResult.error);
  const role = profileResult.data?.role;
  const canPublish = role === "ADMIN" || role === "COMMITTEE";
  const isAdmin = role === "ADMIN";
  const authorIds = [...new Set((noticesResult.data ?? []).map((notice) => notice.author_id))];
  const profilesResult = authorIds.length ? await supabase.from("public_profiles").select("id, full_name").in("id", authorIds) : { data: [], error: null };
  if (profilesResult.error) console.error("Notice author names query failed:", profilesResult.error);
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));

  return (
    <>
      <div className="dashboard-title"><div><h1>নোটিশ বোর্ড</h1><p>সদস্যদের জন্য গুরুত্বপূর্ণ ঘোষণা ও তথ্য।</p></div></div>
      <Feedback status={status} />
      {canPublish && <section className="panel">
        <h2>নতুন নোটিশ প্রকাশ করুন</h2>
        <form className="stacked-form" action={addNotice}>
          <div className="field"><label htmlFor="notice-title">শিরোনাম</label><input id="notice-title" name="title" required placeholder="নোটিশের শিরোনাম" /></div>
          <div className="field"><label htmlFor="notice-content">লেখা</label><textarea id="notice-content" name="content" required placeholder="নোটিশের বিস্তারিত লিখুন" /></div>
          <div className="field"><label htmlFor="notice-image">ছবি (ঐচ্ছিক)</label><input className="file-field" id="notice-image" name="image" type="file" accept="image/jpeg,image/png" /><span className="field-hint">JPG, JPEG অথবা PNG; সর্বোচ্চ ২ MB। ভিডিও আপলোড করা যাবে না।</span></div>
          <button className="button button--gold" type="submit">নোটিশ প্রকাশ করুন</button>
        </form>
      </section>}
      <section className="panel">
        <h2>প্রকাশিত নোটিশ</h2>
        {noticesResult.error ? <EmptyState>নোটিশ লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : (noticesResult.data ?? []).length ? (noticesResult.data ?? []).map((notice) => {
          const canManage = isAdmin || (role === "COMMITTEE" && notice.author_id === user.id && !notice.is_pinned);
          return <article className="notice-detail" key={notice.id}>
            <div className="panel-header"><span className="notice-card__date">{formatDate(notice.created_at)} · {profiles.get(notice.author_id) ?? "ফাউন্ডেশন"}</span>{notice.is_pinned && <span className="pill">গুরুত্বপূর্ণ</span>}</div>
            <h3>{notice.title}</h3><p>{notice.content}</p>
            {notice.image_url && <Image className="notice-image" src={notice.image_url} alt={`${notice.title}-এর ছবি`} width={800} height={450} sizes="(max-width: 760px) calc(100vw - 60px), 560px" />}
            {canManage && <div className="notice-controls">
              <details><summary className="table-action">সম্পাদনা</summary><form className="stacked-form" action={updateNotice}>
                <input type="hidden" name="id" value={notice.id} />
                <label className="field"><span>শিরোনাম</span><input name="title" defaultValue={notice.title} required /></label>
                <label className="field"><span>লেখা</span><textarea name="content" defaultValue={notice.content} required /></label>
                <label className="field"><span>ছবি পরিবর্তন (ঐচ্ছিক)</span><input className="file-field" name="image" type="file" accept="image/jpeg,image/png" /><span className="field-hint">নতুন ছবি না দিলে বর্তমান ছবিই থাকবে; সর্বোচ্চ ২ MB।</span></label>
                <button className="table-action" type="submit">পরিবর্তন সংরক্ষণ করুন</button>
              </form></details>
              {isAdmin && <form action={toggleNoticePin}><input type="hidden" name="id" value={notice.id} /><input type="hidden" name="is_pinned" value={String(notice.is_pinned)} /><button className="table-action" type="submit">{notice.is_pinned ? "পিন সরান" : "পিন করুন"}</button></form>}
              <form action={deleteNotice}><input type="hidden" name="id" value={notice.id} /><ConfirmSubmit>মুছে ফেলুন</ConfirmSubmit></form>
            </div>}
          </article>;
        }) : <EmptyState>এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</EmptyState>}
      </section>
    </>
  );
}
