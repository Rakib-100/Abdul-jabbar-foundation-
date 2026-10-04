import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/feedback";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "অডিট লগ" };

const actionLabels: Record<string, string> = { CREATE: "নতুন হিসাব যোগ", UPDATE: "হিসাব সংশোধন" };

export default async function AuditPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "ADMIN") redirect("/dashboard?status=denied");
  const { data: logs, error } = await supabase.from("audit_logs").select("id, user_id, action, record_id, old_data, new_data, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) console.error("Audit log query failed:", error);
  const actorIds = [...new Set((logs ?? []).map((item) => item.user_id).filter((id): id is string => Boolean(id)))];
  const peopleResult = actorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [], error: null };
  if (peopleResult.error) console.error("Audit actor names query failed:", peopleResult.error);
  const people = new Map((peopleResult.data ?? []).map((person) => [person.id, person.full_name]));

  return (
    <>
      <div className="dashboard-title"><div><h1>অডিট লগ</h1><p>আর্থিক হিসাবে কে কখন পরিবর্তন করেছেন তার ইতিহাস।</p></div></div>
      <section className="panel">
        <h2>আর্থিক পরিবর্তনের ইতিহাস</h2>
        {error ? <EmptyState>অডিট লগ লোড করা যায়নি। পরে আবার চেষ্টা করুন।</EmptyState> : logs?.length ? <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>সময়</th><th>ব্যবহারকারী</th><th>কাজ</th><th>লেনদেন নম্বর</th><th>পরিবর্তনের সারাংশ</th></tr></thead>
          <tbody>{logs.map((log) => {
            const oldAmount = log.old_data && typeof log.old_data === "object" && "amount" in log.old_data ? String(log.old_data.amount) : null;
            const newAmount = log.new_data && typeof log.new_data === "object" && "amount" in log.new_data ? String(log.new_data.amount) : null;
            const summary = log.action === "CREATE" ? `নতুন অঙ্ক: ${newAmount ?? "—"}` : `আগের অঙ্ক: ${oldAmount ?? "—"} · নতুন অঙ্ক: ${newAmount ?? "—"}`;
            return <tr key={log.id}><td>{formatDate(log.created_at)}</td><td>{log.user_id ? people.get(log.user_id) ?? "সদস্যের তথ্য নেই" : "তথ্য নেই"}</td><td>{actionLabels[log.action] ?? "হিসাব পরিবর্তন"}</td><td>{log.record_id?.slice(0, 8) ?? "—"}</td><td>{summary}</td></tr>;
          })}</tbody>
        </table></div> : <EmptyState>এখনও কোনো হিসাব পরিবর্তনের তথ্য নেই।</EmptyState>}
      </section>
    </>
  );
}
