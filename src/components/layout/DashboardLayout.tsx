"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Phone, CalendarDays, Users, Briefcase, FileText, Receipt,
  DollarSign, Shield, BarChart3, Wallet, TrendingUp, Settings, UserPlus,
  Hammer, Layers, Building2, CreditCard, ScrollText, Megaphone, Bell, Menu, X,
  LogOut, User, ChevronDown,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LABELS = {
  en: { dashboard: "Dashboard", calls: "Calls", calendar: "Calendar", customers: "Customers", jobs: "Jobs", quotes: "Quotes", invoices: "Invoices", costs: "Costs", insurance: "Insurance", analytics: "Analytics", payroll: "Payroll", revenueRecovery: "Revenue Recovery", settings: "Settings", team: "Team", flooring: "Flooring", tapis: "Tapis", companies: "Companies", billing: "Billing", logs: "Logs", broadcast: "Broadcast", admin: "Admin", profile: "Profile", logout: "Log out" },
  fr: { dashboard: "Tableau de bord", calls: "Appels", calendar: "Calendrier", customers: "Clients", jobs: "Travaux", quotes: "Soumissions", invoices: "Factures", costs: "Couts", insurance: "Assurances", analytics: "Analytiques", payroll: "Paie", revenueRecovery: "Recouvrement", settings: "Parametres", team: "Equipe", flooring: "Planchers", tapis: "Tapis", companies: "Entreprises", billing: "Facturation", logs: "Journaux", broadcast: "Diffusion", admin: "Admin", profile: "Profil", logout: "Deconnexion" },
};

interface NavItem { href: string; label: string; icon: React.ElementType }

export default function DashboardLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = LABELS.en;
  const isAdmin = (session?.user as any)?.isAdmin ?? false;

  const mainNav: NavItem[] = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { href: "/calls", label: t.calls, icon: Phone },
    { href: "/calendar", label: t.calendar, icon: CalendarDays },
    { href: "/customers", label: t.customers, icon: Users },
    { href: "/jobs", label: t.jobs, icon: Briefcase },
    { href: "/quotes", label: t.quotes, icon: FileText },
    { href: "/invoices", label: t.invoices, icon: Receipt },
    { href: "/costs", label: t.costs, icon: DollarSign },
    { href: "/insurance", label: t.insurance, icon: Shield },
    { href: "/analytics", label: t.analytics, icon: BarChart3 },
    { href: "/payroll", label: t.payroll, icon: Wallet },
    { href: "/revenue-recovery", label: t.revenueRecovery, icon: TrendingUp },
    { href: "/settings", label: t.settings, icon: Settings },
    { href: "/team", label: t.team, icon: UserPlus },
    { href: "/flooring", label: t.flooring, icon: Hammer },
    { href: "/tapis", label: t.tapis, icon: Layers },
  ];

  const adminNav: NavItem[] = [
    { href: "/admin", label: t.dashboard, icon: LayoutDashboard },
    { href: "/admin/companies", label: t.companies, icon: Building2 },
    { href: "/admin/billing", label: t.billing, icon: CreditCard },
    { href: "/admin/logs", label: t.logs, icon: ScrollText },
    { href: "/admin/broadcast", label: t.broadcast, icon: Megaphone },
  ];

  const isActive = (href: string) => href === "/dashboard" || href === "/admin" ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC7418] text-white font-bold text-sm">P</div>
        <span className="text-lg font-bold">Portico</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[#DC7418]/10 text-[#DC7418]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              <Icon className={`h-4 w-4 ${active ? "text-[#DC7418]" : ""}`} />{item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3"><p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">{t.admin}</p></div>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[#DC7418]/10 text-[#DC7418]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
                  <Icon className={`h-4 w-4 ${active ? "text-[#DC7418]" : ""}`} />{item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-white"><SidebarContent /></aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
            <div className="absolute right-2 top-2"><Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></Button></div>
            <SidebarContent />
          </aside>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC7418] text-[10px] text-white">3</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DC7418]/10 text-[#DC7418]"><User className="h-4 w-4" /></div>
                  <span className="hidden sm:inline text-sm">{session?.user?.name || "User"}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild><Link href="/settings" className="flex items-center gap-2"><User className="h-4 w-4" />{t.profile}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-2 text-red-600"><LogOut className="h-4 w-4" />{t.logout}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
