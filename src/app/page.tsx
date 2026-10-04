import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  HeartHandshake,
  Landmark,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getPublicOverview } from "@/lib/public-data";
import { formatCurrency } from "@/lib/format";

export const revalidate = 60;

export default async function Home() {
  const { stats, notices, committee, error } = await getPublicOverview();

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero__glow hero__glow--one" />
          <div className="hero__glow hero__glow--two" />
          <div className="container hero__inner">
            <div className="hero__copy">
              <span className="eyebrow"><HeartHandshake size={16} /> মানবতার সেবায় একসাথে</span>
              <h1>সহমর্মিতার হাত<br /><span>পৌঁছে যাক</span> প্রতিটি ঘরে</h1>
              <p>
                আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন মানুষের পাশে দাঁড়াতে,
                সামর্থ্যবানদের সহায়তা পৌঁছে দিতে এবং স্বচ্ছতার সঙ্গে সেবামূলক
                কাজ এগিয়ে নিতে প্রতিশ্রুতিবদ্ধ।
              </p>
              <div className="hero__actions">
                <a className="button button--gold" href="#amader-kaj">আমাদের কার্যক্রম দেখুন <ArrowUpRight size={17} /></a>
                <Link className="button button--outline-light" href="/login">সদস্য লগইন</Link>
              </div>
              <div className="hero__trust"><ShieldCheck size={17} /> স্বচ্ছ হিসাব, সম্মিলিত উদ্যোগ, মানবিক সহায়তা</div>
            </div>
            <div className="hero__brand" aria-label="আব্দুল জব্বার ফাউন্ডেশন">
              <div className="hero__logo-frame">
                <Image src="/logo-foundation.png" alt="আব্দুল জব্বার ফাউন্ডেশনের লোগো" width={760} height={510} sizes="(max-width: 760px) 90vw, 493px" priority />
              </div>
              <div className="hero__seal"><HeartHandshake size={23} /><span>মানবতার<br />পাশে</span></div>
            </div>
          </div>
          <div className="hero__bottom-line" />
        </section>

        <section className="section section--stats" aria-labelledby="finance-heading">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="eyebrow eyebrow--muted"><Landmark size={15} /> আর্থিক স্বচ্ছতা</span>
              <h2 id="finance-heading">প্রতিটি অনুদানের হিসাব</h2>
              <p>সব হিসাব লেনদেনের তথ্য থেকে স্বয়ংক্রিয়ভাবে গণনা করা হয়।</p>
            </div>
            <div className="stats-link"><a className="text-link" href="/financials">সদস্যভিত্তিক অনুদান ও ব্যয়ের বিস্তারিত দেখুন <ArrowUpRight size={16} /></a></div>
            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-card__icon stat-card__icon--navy"><Landmark size={19} /></span>
                <span className="stat-card__label">মোট ফান্ড সংগ্রহ</span>
                <strong>{formatCurrency(stats?.income ?? null)}</strong>
                <span className="stat-card__foot">সর্বমোট জমা</span>
              </article>
              <article className="stat-card">
                <span className="stat-card__icon stat-card__icon--rose"><ArrowUpRight size={19} /></span>
                <span className="stat-card__label">মোট খরচ</span>
                <strong>{formatCurrency(stats?.expense ?? null)}</strong>
                <span className="stat-card__foot">সেবামূলক কার্যক্রমে</span>
              </article>
              <article className="stat-card stat-card--balance">
                <span className="stat-card__icon stat-card__icon--gold"><ShieldCheck size={19} /></span>
                <span className="stat-card__label">বর্তমান ব্যালেন্স</span>
                <strong>{formatCurrency(stats?.balance ?? null)}</strong>
                <span className="stat-card__foot">জমা থেকে খরচ বাদ দিয়ে</span>
              </article>
            </div>
            {error && <p className="inline-note" role="status">{error}</p>}
          </div>
        </section>

        <section className="section section--warm" id="amader-kaj">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div><span className="eyebrow eyebrow--muted">আমাদের অঙ্গীকার</span><h2>একটু সহায়তা, অনেকটা আশার আলো</h2></div>
              <p>আপনার আস্থা ও সহযোগিতায় আমরা প্রয়োজনের সময়ে মানুষের পাশে থাকার চেষ্টা করি।</p>
            </div>
            <div className="mission-grid">
              <article className="mission-card"><span className="mission-card__number">০১</span><HeartHandshake size={25} /><h3>মানবিক সহায়তা</h3><p>প্রয়োজনের সময়ে সহায়তা পৌঁছে দিতে সম্মিলিত উদ্যোগ।</p></article>
              <article className="mission-card"><span className="mission-card__number">০২</span><Landmark size={25} /><h3>স্বচ্ছ হিসাব</h3><p>জমা ও ব্যয়ের তথ্য সবার জন্য পরিষ্কারভাবে তুলে ধরা।</p></article>
              <article className="mission-card"><span className="mission-card__number">০৩</span><UsersRound size={25} /><h3>একসাথে পথচলা</h3><p>সদস্য ও শুভানুধ্যায়ীদের অংশগ্রহণে সেবার কাজ এগিয়ে নেওয়া।</p></article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div><span className="eyebrow eyebrow--muted">সাম্প্রতিক আপডেট</span><h2>নোটিশ বোর্ড</h2></div>
              <Link className="text-link" href="/notices">সব নোটিশ দেখুন <ArrowUpRight size={16} /></Link>
            </div>
            {notices.length ? <div className="notice-grid">
              {notices.slice(0, 3).map((notice) => (
                <article className="notice-card" key={notice.id}>
                  {notice.is_pinned && <span className="notice-card__tag">গুরুত্বপূর্ণ</span>}
                  <span className="notice-card__date">{notice.date}</span>
                  <h3>{notice.title}</h3>
                  <p>{notice.content}</p>
                  {notice.image && <Image className="notice-image" src={notice.image} alt={`${notice.title}-এর ছবি`} width={800} height={450} sizes="(max-width: 760px) calc(100vw - 60px), 350px" />}
                  <span className="notice-card__author">প্রকাশক: {notice.author}</span>
                </article>
              ))}
            </div> : <div className="empty-state">এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</div>}
          </div>
        </section>

        <section className="section section--committee">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div><span className="eyebrow eyebrow--muted">দায়িত্বে যারা</span><h2>বর্তমান কমিটি</h2></div>
              <Link className="text-link" href="/committee">কমিটির পরিচিতি <ArrowUpRight size={16} /></Link>
            </div>
            {committee.length ? <div className="committee-grid">
              {committee.slice(0, 4).map((member) => (
                <article className="committee-card" key={member.id}>
                  <div className="committee-card__photo">{member.photo ? <Image src={member.photo} alt={member.name} width={80} height={80} /> : <UsersRound size={27} />}</div>
                  <div><span>{member.position}</span><h3>{member.name}</h3>{member.bio && <p>{member.bio}</p>}</div>
                </article>
              ))}
            </div> : <div className="empty-state">বর্তমান কমিটির কোনো তথ্য পাওয়া যায়নি।</div>}
          </div>
        </section>

        <section className="join-cta">
          <div className="container join-cta__inner">
            <div><span className="eyebrow eyebrow--light">আপনিও যুক্ত হোন</span><h2>মানবতার সেবায় আপনার পাশে চাই</h2><p>সদস্য হিসেবে যুক্ত হয়ে আমাদের সেবামূলক উদ্যোগে অংশ নিন।</p></div>
            <Link className="button button--gold" href="/register">সদস্য নিবন্ধন <ArrowUpRight size={17} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
