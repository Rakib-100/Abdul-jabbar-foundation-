import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getPublicCommittee } from "@/lib/public-data";

export const metadata: Metadata = { title: "বর্তমান কমিটি" };
export const revalidate = 60;

export default async function CommitteePage() {
  const { committee, error } = await getPublicCommittee();
  return (
    <>
      <Header />
      <main className="section section--committee">
        <div className="container">
          <Link className="text-link" href="/"><ArrowLeft size={15} /> মূল পাতায় ফিরুন</Link>
          <div className="section-heading">
            <span className="eyebrow eyebrow--muted">দায়িত্বে যারা</span>
            <h1>বর্তমান কমিটি</h1>
            <p>ফাউন্ডেশনের সেবামূলক কার্যক্রম পরিচালনায় যাঁরা দায়িত্ব পালন করছেন।</p>
          </div>
          {error && <p className="form-alert" role="status">{error}</p>}
          {committee.length ? <div className="committee-grid">
            {committee.map((member) => (
              <article className="committee-card" key={member.id}>
                <div className="committee-card__photo">
                  {member.photo
                    ? <Image src={member.photo} alt={`${member.name}-এর ছবি`} width={80} height={80} sizes="67px" />
                    : <UsersRound size={27} />}
                </div>
                <div><span>{member.position}</span><h2>{member.name}</h2>{member.bio && <p>{member.bio}</p>}</div>
              </article>
            ))}
          </div> : !error && <div className="empty-state">বর্তমান কমিটির কোনো তথ্য পাওয়া যায়নি।</div>}
        </div>
      </main>
      <Footer />
    </>
  );
}
