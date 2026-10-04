import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getAllTransactions } from "@/lib/transactions";

export type PublicNotice = {
  id: string;
  title: string;
  content: string;
  image: string | null;
  is_pinned: boolean;
  date: string;
  author: string;
};

export type PublicCommitteeMember = {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  photo: string | null;
};

export async function getPublicNotices() {
  const supabase = await createClient();
  if (!supabase) return { notices: [] as PublicNotice[], error: "Supabase সংযোগ স্থাপনের পর নোটিশ এখানে দেখা যাবে।" };
  const [noticesResult, profilesResult] = await Promise.all([
    supabase.from("notices").select("id, title, content, image_url, is_pinned, author_id, created_at").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("public_profiles").select("id, full_name"),
  ]);
  if (noticesResult.error || profilesResult.error) {
    console.error("Public notices query failed:", noticesResult.error, profilesResult.error);
    return { notices: [] as PublicNotice[], error: "নোটিশ লোড করা যায়নি। পরে আবার চেষ্টা করুন।" };
  }
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
  return {
    notices: (noticesResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      image: item.image_url,
      is_pinned: item.is_pinned,
      date: formatDate(item.created_at),
      author: profiles.get(item.author_id) ?? "ফাউন্ডেশন",
    })),
    error: "",
  };
}

export async function getPublicCommittee() {
  const supabase = await createClient();
  if (!supabase) return { committee: [] as PublicCommitteeMember[], error: "Supabase সংযোগ স্থাপনের পর কমিটির তথ্য এখানে দেখা যাবে।" };
  const [membersResult, profilesResult] = await Promise.all([
    supabase.from("committee_members").select("id, profile_id, position, bio, photo_url, display_order").eq("is_current", true).order("display_order", { ascending: true }),
    supabase.from("public_profiles").select("id, full_name"),
  ]);
  if (membersResult.error || profilesResult.error) {
    console.error("Public committee query failed:", membersResult.error, profilesResult.error);
    return { committee: [] as PublicCommitteeMember[], error: "কমিটির তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।" };
  }
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  return {
    committee: (membersResult.data ?? []).map((item) => {
      const profile = profiles.get(item.profile_id);
      return {
        id: item.id,
        position: item.position,
        bio: item.bio,
        name: profile?.full_name ?? "কমিটির সদস্য",
        photo: item.photo_url ?? null,
      };
    }),
    error: "",
  };
}

export async function getPublicOverview() {
  const empty = {
    stats: null as { income: number; expense: number; balance: number } | null,
    notices: [] as PublicNotice[],
    committee: [] as PublicCommitteeMember[],
    error: "",
  };
  const supabase = await createClient();
  if (!supabase) {
    return { ...empty, error: "Supabase সংযোগ স্থাপনের পর আর্থিক তথ্য ও আপডেট এখানে দেখা যাবে।" };
  }

  const [summaryResult, noticesResult, committeeResult, publicProfilesResult] = await Promise.all([
    supabase.rpc("get_financial_summary", {}),
    supabase.from("notices").select("id, title, content, image_url, is_pinned, author_id, created_at").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    supabase.from("committee_members").select("id, profile_id, position, bio, photo_url, display_order").eq("is_current", true).order("display_order", { ascending: true }).limit(8),
    supabase.from("public_profiles").select("id, full_name"),
  ]);

  const failures = [summaryResult.error, noticesResult.error, committeeResult.error, publicProfilesResult.error].filter(Boolean);
  if (failures.length) {
    console.error("Public data query failed:", failures);
  }
  const publicProfiles = new Map((publicProfilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const totals = summaryResult.data?.[0];
  const notices = (noticesResult.data ?? []).map((item) => {
    const profile = publicProfiles.get(item.author_id);
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      image: item.image_url,
      is_pinned: item.is_pinned,
      date: formatDate(item.created_at),
      author: profile?.full_name ?? "ফাউন্ডেশন",
    };
  });
  const committee = (committeeResult.data ?? []).map((item) => {
    const profile = publicProfiles.get(item.profile_id);
    return {
      id: item.id,
      position: item.position,
      bio: item.bio,
      name: profile?.full_name ?? "কমিটির সদস্য",
      photo: item.photo_url ?? null,
    };
  });

  return {
    stats: summaryResult.error || !totals ? null : { income: Number(totals.income_total), expense: Number(totals.expense_total), balance: Number(totals.current_balance) },
    notices: noticesResult.error ? [] : notices,
    committee: committeeResult.error ? [] : committee,
    error: failures.length ? "কিছু তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।" : "",
  };
}

export async function getPublicFinancialReport() {
  const supabase = await createClient();
  const empty = {
    stats: null as { income: number; expense: number; balance: number } | null,
    contributions: [] as { name: string; amount: number }[],
    expenses: [] as { category: string; recipient: string; amount: number }[],
    error: "",
  };
  if (!supabase) return { ...empty, error: "Supabase সংযোগ স্থাপনের পর আর্থিক তথ্য এখানে দেখা যাবে।" };
  const [summaryResult, transactionsResult, categoriesResult] = await Promise.all([
    supabase.rpc("get_financial_summary", {}),
    getAllTransactions(supabase),
    supabase.from("transaction_categories").select("id, name"),
  ]);
  if (summaryResult.error || transactionsResult.error || categoriesResult.error) {
    console.error("Public financial report query failed:", summaryResult.error, transactionsResult.error, categoriesResult.error);
    return { ...empty, error: "আর্থিক তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।" };
  }
  const transactions = transactionsResult.data ?? [];
  const categoryNames = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
  const totals = summaryResult.data?.[0];
  const contributions = new Map<string, number>();
  const expenses = new Map<string, { category: string; recipient: string; amount: number }>();
  for (const item of transactions) {
    if (item.transaction_type === "INCOME") {
      contributions.set(item.donor_or_recipient, (contributions.get(item.donor_or_recipient) ?? 0) + Number(item.amount));
    } else {
      const category = categoryNames.get(item.category_id ?? "") ?? "অন্যান্য";
      const key = `${category}\u0000${item.donor_or_recipient}`;
      const previous = expenses.get(key);
      expenses.set(key, { category, recipient: item.donor_or_recipient, amount: (previous?.amount ?? 0) + Number(item.amount) });
    }
  }
  return {
    stats: totals ? { income: Number(totals.income_total), expense: Number(totals.expense_total), balance: Number(totals.current_balance) } : null,
    contributions: [...contributions].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    expenses: [...expenses.values()].sort((a, b) => b.amount - a.amount),
    error: "",
  };
}
