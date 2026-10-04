import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllTransactions } from "@/lib/transactions";

function quoteCsv(value: string) {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login", request.url));
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) console.error("CSV authorization lookup failed:", profileError);
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "অনুমতি নেই" }, { status: 403 });

  const start = request.nextUrl.searchParams.get("start") ?? "";
  const end = request.nextUrl.searchParams.get("end") ?? "";
  if ((start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) || (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) || (start && end && start > end)) {
    return NextResponse.json({ error: "তারিখের সীমা সঠিক নয়" }, { status: 400 });
  }
  const [transactionsResult, categoriesResult] = await Promise.all([
    getAllTransactions(supabase, start || undefined, end || undefined),
    supabase.from("transaction_categories").select("id, name"),
  ]);
  if (transactionsResult.error || categoriesResult.error) {
    console.error("CSV export query failed:", transactionsResult.error, categoriesResult.error);
    return NextResponse.json({ error: "রিপোর্ট তৈরি করা যায়নি" }, { status: 500 });
  }
  const categories = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
  const rows = [
    ["ধরন", "টাকার পরিমাণ", "দাতা / গ্রহীতা", "খাত", "তারিখ", "বিবরণ"],
    ...(transactionsResult.data ?? []).map((item) => [
      item.transaction_type === "INCOME" ? "জমা" : "খরচ",
      String(item.amount),
      item.donor_or_recipient,
      categories.get(item.category_id ?? "") ?? "",
      item.transaction_date ?? "",
      item.description ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(quoteCsv).join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="foundation-report.csv"',
      "Cache-Control": "no-store",
    },
  });
}
