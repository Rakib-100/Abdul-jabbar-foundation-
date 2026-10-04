import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__main">
        <div className="site-footer__identity">
          <Image src="/logo-foundation.png" alt="আব্দুল জব্বার ফাউন্ডেশনের লোগো" width={125} height={84} sizes="118px" />
          <p>মানবতার সেবায়, সবার সহযোগিতায়।</p>
        </div>
        <div className="site-footer__links"><h3>দ্রুত লিংক</h3><Link href="/notices">নোটিশ বোর্ড</Link><Link href="/committee">বর্তমান কমিটি</Link><Link href="/login">সদস্য লগইন</Link></div>
        <div className="site-footer__contact"><h3>আমাদের অঙ্গীকার</h3><p><HeartHandshake size={16} /> মানুষের পাশে দাঁড়ানো</p><p><MapPin size={16} /> সেবার কাজে একসাথে</p></div>
      </div>
      <div className="site-footer__bottom"><div className="container"><span>© {new Date().getFullYear()} আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন</span><span>স্বচ্ছতা ও মানবিকতায় অঙ্গীকারবদ্ধ</span></div></div>
    </footer>
  );
}
