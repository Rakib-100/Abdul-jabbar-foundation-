import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, Feedback } from "@/components/feedback";
import {
  addCommitteeMember, removeCommitteeMember, updateCommitteeMember,
} from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "বর্তমান কমিটি" };

export default async function ManageCommitteePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: actor, error: actorError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (actorError) console.error("Committee access lookup failed:", actorError);
  if (actor?.role !== "ADMIN") redirect("/dashboard?status=denied");
  const [membersResult, profilesResult] = await Promise.all([
    supabase.from("committee_members").select("id, profile_id, position, display_order, bio, photo_url").eq("is_current", true).order("display_order", { ascending: true }),
    supabase.from("profiles").select("id, full_name, role, is_active").eq("role", "COMMITTEE").order("full_name"),
  ]);
  if (membersResult.error || profilesResult.error) console.error("Committee management query failed:", membersResult.error, profilesResult.error);
  const members = membersResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const available = profiles.filter((profile) => profile.is_active && !members.some((member) => member.profile_id === profile.id));

  return (
    <>
      <div className="dashboard-title"><div><h1>বর্তমান কমিটি পরিচালনা</h1><p>কমিটির সদস্য, পদ, পরিচিতি ও প্রদর্শনের ক্রম হালনাগাদ করুন।</p></div></div>
      <Feedback status={status} />
      <section className="panel">
        <h2>কমিটিতে সদস্য যোগ করুন</h2>
        {available.length ? <form className="stacked-form" action={addCommitteeMember}>
          <div className="form-row">
            <div className="field"><label htmlFor="profile_id">কমিটির সদস্য</label><select id="profile_id" name="profile_id" required defaultValue=""><option value="" disabled>সদস্য নির্বাচন করুন</option>{available.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></div>
            <div className="field"><label htmlFor="position">পদ</label><input id="position" name="position" required placeholder="পদ লিখুন" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="display_order">প্রদর্শনের ক্রম</label><input id="display_order" name="display_order" type="number" step="1" defaultValue={members.length + 1} required /></div>
            <div className="field"><label htmlFor="committee-photo">ছবি (ঐচ্ছিক)</label><input className="file-field" id="committee-photo" name="photo" type="file" accept="image/jpeg,image/png" /><span className="field-hint">JPG বা PNG; সর্বোচ্চ ২ MB।</span></div>
          </div>
          <div className="field"><label htmlFor="bio">সংক্ষিপ্ত পরিচিতি</label><textarea id="bio" name="bio" placeholder="সদস্যের সংক্ষিপ্ত পরিচিতি" /></div>
          <button className="button button--gold" type="submit">কমিটিতে যোগ করুন</button>
        </form> : <EmptyState>কমিটিতে যোগ করার মতো সক্রিয় কমিটির সদস্য নেই। আগে সদস্য পরিচালনা থেকে কাউকে কমিটির সদস্য করুন।</EmptyState>}
      </section>
      <section className="panel">
        <h2>বর্তমান কমিটির সদস্য</h2>
        {membersResult.error || profilesResult.error ? <EmptyState>কমিটির তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : members.length ? members.map((member) => {
          const profile = byId.get(member.profile_id);
          return <article className="notice-detail committee-admin-row" key={member.id}>
            <div className="committee-card__photo">{member.photo_url ? <Image src={member.photo_url} alt={`${profile?.full_name ?? "সদস্য"}-এর ছবি`} width={67} height={67} sizes="67px" /> : <span>{profile?.full_name?.slice(0, 1) ?? "স"}</span>}</div>
            <div className="committee-admin-row__content">
              <strong>{profile?.full_name ?? "সদস্যের তথ্য পাওয়া যায়নি"}</strong>
              <details><summary className="table-action">সম্পাদনা</summary><form className="stacked-form" action={updateCommitteeMember}>
                <input type="hidden" name="id" value={member.id} />
                <div className="form-row">
                  <label className="field"><span>পদ</span><input name="position" defaultValue={member.position} required /></label>
                  <label className="field"><span>প্রদর্শনের ক্রম</span><input name="display_order" type="number" step="1" defaultValue={member.display_order} required /></label>
                </div>
                <label className="field"><span>পরিচিতি</span><textarea name="bio" defaultValue={member.bio ?? ""} /></label>
                <label className="field"><span>ছবি পরিবর্তন</span><input className="file-field" name="photo" type="file" accept="image/jpeg,image/png" /></label>
                <button className="table-action" type="submit">পরিবর্তন সংরক্ষণ করুন</button>
              </form></details>
              <form action={removeCommitteeMember}><input type="hidden" name="id" value={member.id} /><ConfirmSubmit>কমিটি থেকে বাদ দিন</ConfirmSubmit></form>
            </div>
          </article>;
        }) : <EmptyState>বর্তমান কমিটির কোনো তথ্য পাওয়া যায়নি।</EmptyState>}
      </section>
    </>
  );
}
