"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
} from "lucide-react";
import Link from "next/link";

const LABELS = {
  en: {
    title: "Admin Dashboard",
    totalCompanies: "Total Companies",
    activeCompanies: "Active Companies",
    totalRevenue: "Total Revenue",
    mrr: "MRR",
    recentSignups: "Recent Signups",
    company: "Company",
    plan: "Plan",
    status: "Status",
    created: "Created",
    quickActions: "Quick Actions",
    viewCompanies: "View Companies",
    manageBilling: "Manage Billing",
    viewLogs: "View Logs",
    broadcast: "Broadcast Message",
    noSignups: "No recent signups",
  },
};

interface AdminStats {
  totalCompanies: number;
  activeCompanies: number;
  totalRevenue: number;
  mrr: number;
}

interface RecentSignup {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const t = LABELS.en;
  const [stats, setStats] = useState<AdminStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalRevenue: 0,
    mrr: 0,
  });
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, signupsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/signups?limit=10"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (signupsRes.ok) setSignups(await signupsRes.json());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: t.totalCompanies, value: stats.totalCompanies.toString(), icon: Building2, color: "bg-blue-50 text-blue-600" },
    { label: t.activeCompanies, value: stats.activeCompanies.toString(), icon: Users, color: "bg-green-50 text-green-600" },
    { label: t.totalRevenue, value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "bg-purple-50 text-purple-600" },
    { label: t.mrr, value: formatCurrency(stats.mrr), icon: TrendingUp, color: "bg-orange-50 text-[#DC7418]" },
  ];

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    suspended: "bg-red-100 text-red-700",
  };

  const Spinner = () => (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" />
    </div>
  );

  return (
    <DashboardLayout title={t.title}>
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <p className="mt-1 text-2xl font-bold">{card.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Signups */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-semibold">{t.recentSignups}</h2>
            </div>
            {signups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t.noSignups}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t.company}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t.plan}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t.status}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t.created}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {signups.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 capitalize">{s.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[s.status] || "bg-gray-100"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">{t.quickActions}</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/companies"><Button>{t.viewCompanies}</Button></Link>
              <Link href="/admin/billing"><Button variant="outline">{t.manageBilling}</Button></Link>
              <Link href="/admin/logs"><Button variant="outline">{t.viewLogs}</Button></Link>
              <Link href="/admin/broadcast"><Button variant="outline">{t.broadcast}</Button></Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
