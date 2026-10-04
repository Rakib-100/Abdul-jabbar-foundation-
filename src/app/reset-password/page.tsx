"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (password.length < 8) {
      setMessage("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      setPending(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setMessage("সুপাবেস সংযোগ এখনো সেট করা হয়নি।");
      setPending(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage("পাসওয়ার্ড পরিবর্তন করা যায়নি। পুনরুদ্ধারের লিংকটি মেয়াদোত্তীর্ণ হতে পারে।");
      setPending(false);
      return;
    }
    setSuccess(true);
    setMessage("আপনার পাসওয়ার্ড পরিবর্তন করা হয়েছে।");
    setPending(false);
    window.setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 900);
  }

  return (
    <main className="auth-main reset-shell">
      <section className="auth-card">
        <div className="auth-card__top"><h2>নতুন পাসওয়ার্ড দিন</h2><p>আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড লিখুন।</p></div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field"><label htmlFor="password">নতুন পাসওয়ার্ড</label><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required placeholder="কমপক্ষে ৮ অক্ষর" /></div>
          {message && <p className={`form-alert${success ? " form-alert--success" : ""}`} role="status">{message}</p>}
          <button className="button auth-submit" type="submit" disabled={pending}>{pending ? "লোড হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}</button>
        </form>
        <div className="auth-links"><Link href="/login">লগইনে ফিরে যান</Link></div>
      </section>
    </main>
  );
}
