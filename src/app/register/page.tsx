"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const maxImageSize = 2 * 1024 * 1024;

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"COMMITTEE" | "MEMBER">("MEMBER");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setMessage("");
    if (file && !["image/jpeg", "image/png"].includes(file.type)) {
      setPhoto(null);
      event.currentTarget.value = "";
      setMessage("শুধু JPG, JPEG অথবা PNG ছবি আপলোড করা যাবে।");
      return;
    }
    if (file && file.size > maxImageSize) {
      setPhoto(null);
      event.currentTarget.value = "";
      setMessage("ছবির আকার ২ MB-এর বেশি হতে পারবে না।");
      return;
    }
    setPhoto(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const mobile = String(form.get("mobile") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    if (!fullName) return finish("অনুগ্রহ করে আপনার নাম লিখুন।");
    if (!mobile) return finish("অনুগ্রহ করে মোবাইল নম্বর দিন।");
    if (!address) return finish("অনুগ্রহ করে আপনার ঠিকানা লিখুন।");
    if (!/^[+0-9০-৯][0-9০-৯\s()-]{7,19}$/.test(mobile)) return finish("সঠিক মোবাইল নম্বর দিন।");
    if (password.length < 8) return finish("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
    if (password !== confirmPassword) return finish("দুটি পাসওয়ার্ড মিলছে না।");
    const supabase = createClient();
    if (!supabase) return finish("সুপাবেস সংযোগ এখনো সেট করা হয়নি। প্রকাশের আগে প্রকল্পের পরিবেশ-চলক যোগ করুন।");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, mobile, address, role },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error || !data.user) {
      return finish("নিবন্ধন সম্পন্ন করা যায়নি। ইমেইল ঠিক আছে কি না যাচাই করে আবার চেষ্টা করুন।");
    }

    if (photo && data.session) {
      const extension = photo.type === "image/png" ? "png" : "jpg";
      const path = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, photo, { contentType: photo.type, upsert: true });
      if (uploadError) {
        console.error("Profile photo upload failed:", uploadError);
        setMessage("নিবন্ধন হয়েছে, তবে ছবিটি আপলোড করা যায়নি। লগইন করে প্রোফাইল থেকে আবার যোগ করুন।");
        setSuccess(true);
        setPending(false);
        return;
      } else {
        const { error: updateError } = await supabase.from("profiles").update({ profile_photo_url: path }).eq("id", data.user.id);
        if (updateError) {
          console.error("Profile photo URL update failed:", updateError);
          const { error: cleanupError } = await supabase.storage.from("profile-photos").remove([path]);
          if (cleanupError) console.error("Unused profile photo cleanup failed:", cleanupError);
          setMessage("নিবন্ধন হয়েছে, তবে ছবিটি প্রোফাইলে সংরক্ষণ করা যায়নি। লগইন করে আবার যোগ করুন।");
          setSuccess(true);
          setPending(false);
          return;
        }
      }
    }

    if (!data.session) {
      setMessage("নিবন্ধন অনুরোধ গৃহীত হয়েছে। ইমেইল নিশ্চিত করে লগইন করুন; প্রয়োজনে পরে প্রোফাইল ছবি যোগ করতে পারবেন।");
      setSuccess(true);
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
    setPending(false);

    function finish(text: string) {
      setMessage(text);
      setSuccess(false);
      setPending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="auth-shell">
        <aside className="auth-aside">
          <Link className="brand" href="/">
            <span className="brand__logo"><Image src="/logo-foundation.png" alt="" width={54} height={42} sizes="57px" /></span>
            <span className="brand__text"><strong>আব্দুল জব্বার</strong><small>চ্যারিটি ফাউন্ডেশন</small></span>
          </Link>
          <div className="auth-aside__body">
            <Image src="/logo-foundation.png" alt="আব্দুল জব্বার ফাউন্ডেশনের লোগো" width={310} height={210} sizes="155px" />
            <h1>সেবার কাজে<br />আপনিও যুক্ত হোন</h1>
            <p>সদস্য হিসেবে নিবন্ধন করুন এবং ফাউন্ডেশনের স্বচ্ছতা ও মানবিক সেবার যাত্রায় অংশ নিন।</p>
          </div>
          <span className="auth-aside__foot">মানবতার সেবায়, সবার সহযোগিতায়</span>
        </aside>
        <section className="auth-main">
          <div className="auth-card">
            <div className="auth-card__top"><h2>সদস্য নিবন্ধন</h2><p>আপনি কোন ধরনের সদস্য হিসেবে নিবন্ধন করতে চান?</p></div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="role-options" role="radiogroup" aria-label="সদস্যের ধরন">
                <div className="role-option"><input id="committee-role" type="radio" name="role-choice" checked={role === "COMMITTEE"} onChange={() => setRole("COMMITTEE")} /><label htmlFor="committee-role">কমিটির সদস্য</label></div>
                <div className="role-option"><input id="member-role" type="radio" name="role-choice" checked={role === "MEMBER"} onChange={() => setRole("MEMBER")} /><label htmlFor="member-role">সাধারণ সদস্য</label></div>
              </div>
              <div className="field"><label htmlFor="full_name">নাম</label><input id="full_name" name="full_name" autoComplete="name" required placeholder="আপনার পূর্ণ নাম লিখুন" /></div>
              <div className="form-row">
                <div className="field"><label htmlFor="mobile">মোবাইল নম্বর</label><input id="mobile" name="mobile" type="tel" autoComplete="tel" required placeholder="০১XXXXXXXXX" /></div>
                <div className="field"><label htmlFor="email">ইমেইল</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" /></div>
              </div>
              <div className="field"><label htmlFor="address">ঠিকানা</label><input id="address" name="address" autoComplete="street-address" required placeholder="আপনার ঠিকানা" /></div>
              <div className="form-row">
                <div className="field"><label htmlFor="password">পাসওয়ার্ড</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="কমপক্ষে ৮ অক্ষর" /></div>
                <div className="field"><label htmlFor="confirm_password">পাসওয়ার্ড আবার লিখুন</label><input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required placeholder="পাসওয়ার্ড নিশ্চিত করুন" /></div>
              </div>
              <div className="field"><label htmlFor="photo">ছবি আপলোড করুন</label><input className="file-field" id="photo" name="photo" type="file" accept="image/jpeg,image/png" onChange={choosePhoto} /><span className="field-hint">JPG, JPEG অথবা PNG; সর্বোচ্চ ২ MB।</span></div>
              {message && <div className={`form-alert${success ? " form-alert--success" : ""}`} role="status">{message}</div>}
              <button className="button auth-submit" type="submit" disabled={pending}>{pending ? "লোড হচ্ছে..." : "নিবন্ধন করুন"}</button>
            </form>
            <div className="auth-links"><span>আগেই সদস্য? <Link href="/login">লগইন করুন</Link></span><Link href="/">মূল পাতায় ফিরে যান</Link></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
