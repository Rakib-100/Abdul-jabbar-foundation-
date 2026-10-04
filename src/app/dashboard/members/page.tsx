import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Feedback, EmptyState } from "@/components/feedback";
import { setMemberAccess } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Role } from "@/types/database";
import { formatBangladeshPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "সদস্য পরিচালনা" };

const roleLabels: Record<Role, string> = { ADMIN: "অ্যাডমিন", COMMITTEE: "কমিটির সদস্য", MEMBER: "সাধারণ সদস্য" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ status?: string; খুঁজুন?: string }> }) {
  const { status, খুঁজুন: search = "" } = await searchParams;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: currentProfile, error: accessError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (accessError) console.error("Member page authorization lookup failed:", accessError);
  if (currentProfile?.role !== "ADMIN") redirect("/dashboard?status=denied");
  let query = supabase.from("profiles").select("id, full_name, mobile, address, role, is_active, created_at").order("created_at", { ascending: false });
  if (search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);
  const { data: members, error } = await query;
  if (error) console.error("Member management query failed:", error);

  return (
    <>
      <div className="dashboard-title"><div><h1>সদস্য পরিচালনা</h1><p>সদস্যদের তথ্য, অনুমতি ও অ্যাকাউন্টের অবস্থা পরিচালনা করুন।</p></div></div>
      <Feedback status={status} />
      <section className="panel">
        <form className="form-inline" method="get">
          <div className="field"><label htmlFor="search-members">নাম দিয়ে খুঁজুন</label><input id="search-members" name="খুঁজুন" defaultValue={search} placeholder="সদস্যের নাম লিখুন" /></div>
          <button className="button button--gold" type="submit">খুঁজুন</button>
        </form>
      </section>
      <section className="panel">
        <h2>সদস্যবৃন্দ</h2>
        {error ? <EmptyState>সদস্যদের তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : members?.length ? <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>নাম</th><th>মোবাইল নম্বর</th><th>ঠিকানা</th><th>ধরন</th><th>নিবন্ধনের তারিখ</th><th>অবস্থা</th><th>পরিচালনা</th></tr></thead>
          <tbody>{members.map((member) => <tr key={member.id}>
            <td>{member.full_name}</td>
            <td>{formatBangladeshPhone(member.mobile)}</td><td>{member.address ?? "—"}</td>
            <td>{roleLabels[member.role]}</td><td>{formatDate(member.created_at)}</td>
            <td><span className={`pill${member.is_active ? "" : " pill--inactive"}`}>{member.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span></td>
            <td>{member.role === "ADMIN" ? "—" : <div className="member-access-form">
              <form action={setMemberAccess}>
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="active" value={String(member.is_active)} />
                <select name="role" defaultValue={member.role} aria-label={`${member.full_name}-এর ধরন`}>
                  <option value="MEMBER">সাধারণ সদস্য</option><option value="COMMITTEE">কমিটির সদস্য</option>
                </select>
                <button className="table-action" type="submit">ধরন সংরক্ষণ</button>
              </form>
              <form action={setMemberAccess}>
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="role" value={member.role} />
                <input type="hidden" name="active" value={String(!member.is_active)} />
                <button className="table-action" type="submit">{member.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}</button>
              </form>
            </div>}</td>
          </tr>)}</tbody>
        </table></div> : <EmptyState>কোনো সদস্য পাওয়া যায়নি।</EmptyState>}
      </section>
    </>
  );
}
