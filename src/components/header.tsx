import Image from "next/image";
import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";

const links = [
  ["হোম", "/"],
  ["আমাদের সম্পর্কে", "/#amader-kaj"],
  ["নোটিশ", "/notices"],
  ["বর্তমান কমিটি", "/committee"],
  ["আর্থিক হিসাব", "/financials"],
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/" aria-label="আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন - হোম">
          <span className="brand__logo"><Image src="/logo-foundation.png" alt="" width={54} height={42} sizes="57px" priority /></span>
          <span className="brand__text"><strong>আব্দুল জব্বার</strong><small>চ্যারিটি ফাউন্ডেশন</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="প্রধান নেভিগেশন">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="header-login" href="/login"><ShieldCheck size={16} /> লগইন</Link>
          <details className="mobile-menu">
            <summary aria-label="মেনু খুলুন"><Menu size={21} /></summary>
            <nav aria-label="মোবাইল নেভিগেশন">
              {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
              <Link href="/login">লগইন</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
