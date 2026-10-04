import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type TransactionRow = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  "id" | "transaction_type" | "amount" | "category_id" | "donor_or_recipient" | "description" | "transaction_date"
>;

export async function getAllTransactions(
  supabase: SupabaseClient<Database>,
  startDate?: string,
  endDate?: string,
) {
  const transactions: TransactionRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from("transactions")
      .select("id, transaction_type, amount, category_id, donor_or_recipient, description, transaction_date")
      .order("transaction_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (startDate) query = query.gte("transaction_date", startDate);
    if (endDate) query = query.lte("transaction_date", endDate);
    const { data, error } = await query;
    if (error) return { data: null, error };
    transactions.push(...data);
    if (data.length < pageSize) break;
  }

  return { data: transactions, error: null };
}
