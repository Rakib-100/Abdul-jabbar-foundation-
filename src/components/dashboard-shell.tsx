import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell, FileBarChart, FileClock, HandCoins, LayoutDashboard,
  LogOut, UserRound, Users, UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types/database";
import { DashboardAutoRefresh } from "@/components/dashboard-auto-refresh";

const roleNames: Record<Role, string> = {
  ADMIN: "অ্যাডমিন",
  COMMITTEE: "কমিটির সদস্য",
  MEMBER: "সাধারণ সদস্য",
};

export async function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=setup");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) console.error("Dashboard profile lookup failed:", profileError);
  if (!profile || !profile.is_active) redirect("/login?error=profile");

  const isAdmin = profile.role === "ADMIN";
  let pendingDonations = 0;
  if (isAdmin) {
    const { count, error } = await supabase.from("donation_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING");
    if (error) console.error("Pending donation notification count failed:", error);
    pendingDonations = count ?? 0;
  }
  const menu = [
    { href: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "প্রোফাইল", icon: UserRound },
    { href: "/dashboard/transactions", label: "লেনদেনের তথ্য", icon: HandCoins },
    { href: "/dashboard/notices", label: "নোটিশ বোর্ড", icon: Bell },
    ...(isAdmin ? [
      { href: "/dashboard/donations", label: "অনুদানের আবেদন", icon: HandCoins },
      { href: "/dashboard/members", label: "সদস্য পরিচালনা", icon: Users },
      { href: "/dashboard/committee", label: "বর্তমান কমিটি", icon: UsersRound },
      { href: "/dashboard/reports", label: "রিপোর্ট", icon: FileBarChart },
      { href: "/dashboard/audit", label: "অডিট লগ", icon: FileClock },
    ] : []),
  ];

  return (
    <div className="dashboard-layout">
      {isAdmin && <DashboardAutoRefresh />}
      <header className="dashboard-header">
        <Link className="brand" href="/">
          <span className="brand__logo"><Image src="/logo-foundation.png" alt="" width={54} height={42} /></span>
          <span className="brand__text"><strong>আব্দুল জব্বার</strong><small>সদস্য পোর্টাল</small></span>
        </Link>
        <div className="dashboard-header__right">
          <div className="dashboard-user"><strong>{profile.full_name}</strong><span>{roleNames[profile.role]}</span></div>
          <form action={async () => {
            "use server";
            const client = await createClient();
            if (!client) redirect("/login");
            const { error } = await client.auth.signOut();
            if (error) {
              console.error("Sign out failed:", error);
              redirect("/dashboard?status=signout-error");
            }
            redirect("/");
          }}>
            <button className="header-login" type="submit" aria-label="লগআউট"><LogOut size={15} /><span>লগআউট</span></button>
          </form>
        </div>
      </header>
      <div className="dashboard-body">
        <nav className="dashboard-nav" aria-label="সদস্য পোর্টাল নেভিগেশন">
          {menu.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={href === "/dashboard/donations" && pendingDonations > 0 ? "dashboard-nav__has-notice" : undefined}><Icon />{label}{href === "/dashboard/donations" && pendingDonations > 0 && <span className="donation-badge" aria-label={`${pendingDonations}টি নতুন অনুদানের আবেদন`}>{pendingDonations > 99 ? "৯৯+" : pendingDonations.toLocaleString("bn-BD")}</span>}</Link>)}
        </nav>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
