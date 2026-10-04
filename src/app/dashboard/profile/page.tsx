import type { Metadata } from "next";
import Image from "next/image";
import { Feedback } from "@/components/feedback";
import { updateProfile } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatBangladeshPhone } from "@/lib/phone";
import type { Role } from "@/types/database";

export const metadata: Metadata = { title: "প্রোফাইল" };

const roleLabels: Record<Role, string> = { ADMIN: "অ্যাডমিন", COMMITTEE: "কমিটির সদস্য", MEMBER: "সাধারণ সদস্য" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase.from("profiles")
    .select("full_name, mobile, address, profile_photo_url, role, created_at")
    .eq("id", user.id).maybeSingle();
  if (error) console.error("Profile page query failed:", error);
  if (!profile) return <p className="form-alert">প্রোফাইল লোড করা যায়নি। পরে আবার চেষ্টা করুন।</p>;
  let signedPhotoUrl: string | null = null;
  if (profile.profile_photo_url) {
    const { data, error: photoError } = await supabase.storage.from("profile-photos").createSignedUrl(profile.profile_photo_url, 3600);
    if (photoError) console.error("Private profile photo could not be loaded:", photoError);
    signedPhotoUrl = data?.signedUrl ?? null;
  }

  return (
    <>
      <div className="dashboard-title"><div><h1>আমার প্রোফাইল</h1><p>আপনার ব্যক্তিগত তথ্য হালনাগাদ করুন।</p></div></div>
      <Feedback status={status} />
      <section className="panel">
        {signedPhotoUrl && <Image className="profile-photo-preview" src={signedPhotoUrl} alt="আপনার প্রোফাইল ছবি" width={100} height={100} sizes="100px" />}
        <form className="stacked-form" action={updateProfile}>
          <div className="field"><label htmlFor="full_name">নাম</label><input id="full_name" name="full_name" defaultValue={profile.full_name} required /></div>
          <div className="form-row">
            <div className="field"><label htmlFor="mobile">লগইন মোবাইল নম্বর</label><input id="mobile" name="mobile" type="tel" value={formatBangladeshPhone(profile.mobile)} readOnly /><span className="field-hint">এই নম্বরটি আপনার লগইন আইডি; পরিবর্তনের জন্য প্রশাসকের সঙ্গে যোগাযোগ করুন।</span></div>
            <div className="field"><label htmlFor="member-type">সদস্যের ধরন</label><input id="member-type" value={roleLabels[profile.role]} readOnly /></div>
          </div>
          <div className="field"><label htmlFor="address">ঠিকানা</label><input id="address" name="address" defaultValue={profile.address ?? ""} /></div>
          <div className="field"><label htmlFor="photo">প্রোফাইল ছবি</label><input className="file-field" id="photo" name="photo" type="file" accept="image/jpeg,image/png" /><span className="field-hint">JPG, JPEG অথবা PNG; সর্বোচ্চ ২ MB।{profile.profile_photo_url ? " নতুন ছবি না দিলে বর্তমান ছবিই থাকবে।" : ""}</span></div>
          <p className="field-hint">সদস্যের ধরন: {roleLabels[profile.role]} · নিবন্ধনের তারিখ: {formatDate(profile.created_at)}</p>
          <button className="button button--gold" type="submit">পরিবর্তন সংরক্ষণ করুন</button>
        </form>
      </section>
    </>
  );
}
