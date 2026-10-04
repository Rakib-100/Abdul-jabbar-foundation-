"use client";

import { type FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function DonationForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    setSuccess(false);
    setPending(true);
    const form = new FormData(formElement);
    const donorName = String(form.get("donor_name") ?? "").trim();
    const transactionReference = String(form.get("transaction_reference") ?? "").trim();
    const amount = Number(form.get("amount"));
    if (donorName.length < 2) return finish("অনুগ্রহ করে আপনার নাম লিখুন।");
    if (transactionReference.length < 4 || transactionReference.length > 80) return finish("সঠিক ট্রানজেকশন আইডি লিখুন।");
    if (!Number.isFinite(amount) || amount <= 0) return finish("টাকার পরিমাণ অবশ্যই ০-এর বেশি হতে হবে।");
    const supabase = createClient();
    if (!supabase) return finish("অনুদান জমা দেওয়ার ব্যবস্থা চালু করতে Supabase সেটআপ প্রয়োজন।");

    const { error } = await supabase.from("donation_submissions").insert({
      donor_name: donorName,
      transaction_reference: transactionReference,
      amount,
    });
    if (error) {
      console.error("Donation submission failed:", error);
      return finish(error.code === "23505"
        ? "এই ট্রানজেকশন আইডি দিয়ে আবেদন আগে জমা হয়েছে।"
        : "আবেদন জমা হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।");
    }
    formElement.reset();
    setSuccess(true);
    setMessage("আপনার অনুদানের তথ্য প্রশাসকের কাছে পাঠানো হয়েছে। যাচাই শেষে প্রশাসক হিসাবের খাতায় যোগ করবেন।");
    setPending(false);

    function finish(text: string) {
      setSuccess(false);
      setMessage(text);
      setPending(false);
    }
  }

  return (
    <section className="donation-section" id="donate" aria-labelledby="donation-heading">
      <div className="container donation-layout">
        <div className="donation-copy">
          <span className="eyebrow eyebrow--muted"><HeartHandshake size={16} /> আপনার দান, কারও আশার আলো</span>
          <h2 id="donation-heading">দান করুন</h2>
          <p className="donation-lead">আপনার সামর্থ্য অনুযায়ী অনুদান দিয়ে মানুষের পাশে দাঁড়ান। প্রতিটি অনুদান যাচাই করে তবেই ফাউন্ডেশনের মূল হিসাবে যোগ করা হয়।</p>
          <div className="donation-instructions">
            <span className="donation-step">টাকা পাঠানোর নিয়ম</span>
            <p>দান করতে চাইলে নিচের বিকাশ নম্বরে <strong>সেন্ড মানি</strong> করুন।</p>
            <a className="donation-number" href="tel:01304040565">01304-040565 <span>বিকাশ পার্সোনাল</span></a>
            <p className="donation-reminder"><CheckCircle2 size={16} /> (ট্রানজেকশন আইডি সংরক্ষণ করুন)</p>
          </div>
          <p className="donation-privacy">আপনার দেওয়া তথ্য শুধু অনুদান যাচাইয়ের জন্য প্রশাসক দেখতে পারবেন।</p>
        </div>
        <div className="donation-card">
          <div className="donation-card__heading"><span className="donation-card__icon"><HeartHandshake size={20} /></span><div><h3>অনুদানের তথ্য পাঠান</h3><p>টাকা পাঠানোর পর ফর্মটি পূরণ করুন।</p></div></div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field"><label htmlFor="donor_name">আপনার নাম</label><input id="donor_name" name="donor_name" autoComplete="name" required maxLength={120} placeholder="যে নামে অনুদান পাঠিয়েছেন" /></div>
            <div className="field"><label htmlFor="transaction_reference">ট্রানজেকশন আইডি</label><input id="transaction_reference" name="transaction_reference" required maxLength={80} autoComplete="off" placeholder="বিকাশের ট্রানজেকশন আইডি লিখুন" /></div>
            <div className="field"><label htmlFor="donation-amount">টাকার পরিমাণ</label><div className="amount-input"><span>৳</span><input id="donation-amount" name="amount" type="number" min="1" step="0.01" required placeholder="টাকার পরিমাণ লিখুন" /></div></div>
            {message && <p className={`form-alert${success ? " form-alert--success" : ""}`} role="status">{message}</p>}
            <button className="button button--gold donation-submit" type="submit" disabled={pending}>{pending ? "তথ্য পাঠানো হচ্ছে..." : "অনুদানের তথ্য জমা দিন"} <ArrowUpRight size={16} /></button>
            <span className="donation-note">তথ্য পাঠালে সঙ্গে সঙ্গে হিসাবে টাকা যোগ হবে না। প্রশাসক বিকাশে লেনদেন যাচাই করে অনুমোদন করলে তবেই হিসাবে যোগ হবে।</span>
          </form>
        </div>
      </div>
    </section>
  );
}
