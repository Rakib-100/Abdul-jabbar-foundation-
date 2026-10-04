import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Pin } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getPublicNotices } from "@/lib/public-data";

export const metadata: Metadata = { title: "নোটিশ বোর্ড" };
export const revalidate = 60;

export default async function NoticesPage() {
  const { notices, error } = await getPublicNotices();
  return (
    <>
      <Header />
      <main className="section">
        <div className="container">
          <Link className="text-link" href="/"><ArrowLeft size={15} /> মূল পাতায় ফিরুন</Link>
          <div className="section-heading">
            <span className="eyebrow eyebrow--muted">ফাউন্ডেশনের আপডেট</span>
            <h1>নোটিশ বোর্ড</h1>
            <p>ফাউন্ডেশনের সাম্প্রতিক ঘোষণা ও গুরুত্বপূর্ণ তথ্য।</p>
          </div>
          {error && <p className="form-alert" role="status">{error}</p>}
          {notices.length ? <div className="notice-grid">
            {notices.map((notice) => (
              <article className="notice-card" key={notice.id}>
                {notice.is_pinned && <span className="notice-card__tag"><Pin size={11} /> গুরুত্বপূর্ণ</span>}
                <span className="notice-card__date">{notice.date}</span>
                <h2>{notice.title}</h2>
                <p>{notice.content}</p>
                {notice.image && <Image className="notice-image" src={notice.image} alt={`${notice.title}-এর ছবি`} width={800} height={450} sizes="(max-width: 760px) calc(100vw - 60px), 560px" />}
                <span className="notice-card__author">প্রকাশক: {notice.author}</span>
              </article>
            ))}
          </div> : !error && <div className="empty-state">এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</div>}
        </div>
      </main>
      <Footer />
    </>
  );
}
