"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { toMemberAuthEmail } from "@/lib/member-id";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [helpMode, setHelpMode] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const loginEmail = toMemberAuthEmail(String(form.get("mobile") ?? ""));
    if (!loginEmail) {
      setMessage("লগইন আইডি হিসেবে ঠিক ১১টি অঙ্ক লিখুন।");
      setPending(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setMessage("সুপাবেস সংযোগ এখনো সেট করা হয়নি। প্রকাশের আগে প্রকল্পের পরিবেশ-চলক যোগ করুন।");
      setPending(false);
      return;
    }

    if (helpMode) {
      setMessage("লগইন আইডি যাচাই ছাড়া স্বয়ংক্রিয়ভাবে পাসওয়ার্ড বদলানো নিরাপদ নয়। পরিচয় যাচাইয়ের জন্য ফাউন্ডেশন প্রশাসকের সঙ্গে যোগাযোগ করুন।");
      setPending(false);
      return;
    }

    const password = String(form.get("password") ?? "");
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error || !data.user) {
      setMessage("লগইন আইডি অথবা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।");
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
              <h2>{helpMode ? "পাসওয়ার্ড সহায়তা" : "লগইন করুন"}</h2>
              <p>{helpMode ? "অ্যাকাউন্টের নিরাপত্তার জন্য প্রশাসকের সাহায্য নিন।" : "আপনার ১১ অঙ্কের লগইন আইডি ও পাসওয়ার্ড দিয়ে প্রবেশ করুন।"}</p>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="field"><label htmlFor="mobile">লগইন আইডি (১১ অঙ্ক)</label><input id="mobile" name="mobile" type="text" inputMode="numeric" autoComplete="username" maxLength={11} required placeholder="১১ অঙ্কের আইডি লিখুন" /></div>
              {!helpMode && <div className="field"><label htmlFor="password">পাসওয়ার্ড</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="আপনার পাসওয়ার্ড লিখুন" /></div>}
              {message && <div className="form-alert" role="status">{message}</div>}
              {!helpMode && <button className="button auth-submit" type="submit" disabled={pending}>{pending ? "লোড হচ্ছে..." : "লগইন করুন"}</button>}
            </form>
            <div className="auth-links">
              <button className="table-action" type="button" onClick={() => { setHelpMode(!helpMode); setMessage(""); }}>
                {helpMode ? "লগইনে ফিরে যান" : "পাসওয়ার্ড ভুলে গেছেন?"}
              </button>
              {!helpMode && <span>নতুন সদস্য? <Link href="/register">নিবন্ধন করুন</Link></span>}
            </div>
            {helpMode && <div className="form-alert">অ্যাকাউন্টের লগইন আইডি যাচাই করা ছাড়া পাসওয়ার্ড পুনরুদ্ধার করা নিরাপদ নয়।</div>}
            <div className="auth-divider" />
            <Link className="text-link" href="/">মূল পাতায় ফিরে যান</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
