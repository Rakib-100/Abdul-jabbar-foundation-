"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createClient();
    if (!supabase) {
      setMessage("সুপাবেস সংযোগ এখনো সেট করা হয়নি। প্রকাশের আগে প্রকল্পের পরিবেশ-চলক যোগ করুন।");
      setPending(false);
      return;
    }

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      setMessage(error ? "পাসওয়ার্ড পুনরুদ্ধারের ইমেইল পাঠানো যায়নি। ঠিকানা যাচাই করে আবার চেষ্টা করুন।" : "পাসওয়ার্ড পরিবর্তনের নির্দেশনা আপনার ইমেইলে পাঠানো হয়েছে।");
      setSuccess(!error);
      setPending(false);
      return;
    }

    const password = String(form.get("password") ?? "");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setMessage("ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।");
      setPending(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile) {
      await supabase.auth.signOut();
      setMessage("আপনার সদস্য-তথ্য পাওয়া যায়নি। ফাউন্ডেশনের প্রশাসকের সঙ্গে যোগাযোগ করুন।");
      setPending(false);
      return;
    }
    if (!profile.is_active) {
      await supabase.auth.signOut();
      setMessage("আপনার সদস্য অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয়। ফাউন্ডেশনের প্রশাসকের সঙ্গে যোগাযোগ করুন।");
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
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
            <h1>একসাথে থাকি,<br />মানুষের পাশে দাঁড়াই</h1>
            <p>সদস্যদের জন্য নিরাপদ হিসাব ও তথ্য ব্যবস্থাপনা। আপনার অ্যাকাউন্টে প্রবেশ করে ফাউন্ডেশনের কার্যক্রমের সঙ্গে যুক্ত থাকুন।</p>
          </div>
          <span className="auth-aside__foot">মানবতার সেবায়, সবার সহযোগিতায়</span>
        </aside>
        <section className="auth-main">
          <div className="auth-card">
            <div className="auth-card__top">
              <h2>{resetMode ? "পাসওয়ার্ড পুনরুদ্ধার" : "লগইন করুন"}</h2>
              <p>{resetMode ? "আপনার ইমেইলে পাসওয়ার্ড পরিবর্তনের নির্দেশনা পাঠানো হবে।" : "আপনার সদস্য অ্যাকাউন্টে প্রবেশ করুন।"}</p>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="field"><label htmlFor="email">ইমেইল</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="আপনার ইমেইল লিখুন" /></div>
              {!resetMode && <div className="field"><label htmlFor="password">পাসওয়ার্ড</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="আপনার পাসওয়ার্ড লিখুন" /></div>}
              {message && <div className={`form-alert${success ? " form-alert--success" : ""}`} role="status">{message}</div>}
              <button className="button auth-submit" type="submit" disabled={pending}>{pending ? "লোড হচ্ছে..." : resetMode ? "নির্দেশনা পাঠান" : "লগইন করুন"}</button>
            </form>
            <div className="auth-links">
              <button className="table-action" type="button" onClick={() => { setResetMode(!resetMode); setMessage(""); }}>
                {resetMode ? "লগইনে ফিরে যান" : "পাসওয়ার্ড ভুলে গেছেন?"}
              </button>
              {!resetMode && <span>নতুন সদস্য? <Link href="/register">নিবন্ধন করুন</Link></span>}
            </div>
            <div className="auth-divider" />
            <Link className="text-link" href="/">মূল পাতায় ফিরে যান</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
