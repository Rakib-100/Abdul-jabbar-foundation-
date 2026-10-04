export type Role = "ADMIN" | "COMMITTEE" | "MEMBER";
export type TransactionType = "INCOME" | "EXPENSE";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          mobile: string | null;
          address: string | null;
          email: string;
          profile_photo_url: string | null;
          role: Role;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string; full_name: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      transaction_categories: {
        Row: { id: string; name: string; type: TransactionType; is_active: boolean; created_at: string };
        Insert: { name: string; type: TransactionType; is_active?: boolean };
        Update: Partial<Database["public"]["Tables"]["transaction_categories"]["Row"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string; transaction_type: TransactionType; amount: number; category_id: string | null;
          donor_or_recipient: string; description: string | null; transaction_date: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          transaction_type: TransactionType; amount: number; category_id?: string | null;
          donor_or_recipient: string; description?: string | null; transaction_date?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      notices: {
        Row: {
          id: string; title: string; content: string; image_url: string | null; author_id: string;
          is_pinned: boolean; created_at: string; updated_at: string;
        };
        Insert: { title: string; content: string; image_url?: string | null; author_id: string; is_pinned?: boolean };
        Update: Partial<Database["public"]["Tables"]["notices"]["Insert"]>;
        Relationships: [];
      };
      committee_members: {
        Row: { id: string; profile_id: string; position: string; display_order: number; bio: string | null; photo_url: string | null; is_current: boolean; created_at: string };
        Insert: { profile_id: string; position: string; display_order?: number; bio?: string | null; photo_url?: string | null; is_current?: boolean };
        Update: Partial<Database["public"]["Tables"]["committee_members"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: { id: string; user_id: string | null; action: string; table_name: string; record_id: string | null; old_data: unknown; new_data: unknown; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: { id: string; full_name: string };
        Relationships: [];
      };
    };
    Functions: {
      set_member_access: {
        Args: { target_profile_id: string; target_role: Role; target_is_active: boolean };
        Returns: undefined;
      };
      get_financial_summary: {
        Args: Record<string, never>;
        Returns: { income_total: number; expense_total: number; current_balance: number }[];
      };
    };
    Enums: { app_role: Role; transaction_type: TransactionType };
    CompositeTypes: Record<string, never>;
  };
};
