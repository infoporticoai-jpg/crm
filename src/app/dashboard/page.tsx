"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Phone, TrendingUp, CalendarDays, DollarSign, Briefcase, Users, Receipt } from "lucide-react";

interface Stats { totalCalls: number; conversionRate: number; appointments: number; estRevenue: number }
interface Call { id: string; callerName: string; damageType: string; duration: number; createdAt: string }
interface Appointment { id: string; title: string; customerName: string; date: string; time: string }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalCalls: 0, conversionRate: 0, appointments: 0, estRevenue: 0 });
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [s, c, a] = await Promise.all([fetch("/api/analytics/stats"), fetch("/api/calls?limit=5"), fetch("/api/appointments?upcoming=true&limit=5")]);
        if (s.ok) setStats(await s.json()); if (c.ok) setRecentCalls(await c.json()); if (a.ok) setUpcomingAppts(await a.json());
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Total Calls", value: stats.totalCalls.toString(), icon: Phone, color: "bg-blue-50 text-blue-600" },
    { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "bg-green-50 text-green-600" },
    { label: "Appointments", value: stats.appointments.toString(), icon: CalendarDays, color: "bg-purple-50 text-purple-600" },
    { label: "Est. Revenue", value: formatCurrency(stats.estRevenue), icon: DollarSign, color: "bg-orange-50 text-[#DC7418]" },
  ];

  if (loading) return <DashboardLayout title="Dashboard"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => { const Icon = card.icon; return (
            <div key={card.label} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-500">{card.label}</p><p className="mt-1 text-2xl font-bold">{card.value}</p></div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}><Icon className="h-6 w-6" /></div>
              </div>
            </div>
          ); })}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">Recent Calls</h2><Link href="/calls"><Button variant="ghost" size="sm">View All</Button></Link></div>
            {recentCalls.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center m-4"><Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">No calls recorded yet</p></div>
            : <div className="divide-y">{recentCalls.map((call) => (<div key={call.id} className="flex items-center justify-between p-4"><div><p className="font-medium">{call.callerName}</p><p className="text-sm text-gray-500">{call.damageType} - {call.duration}s</p></div><p className="text-sm text-gray-500">{formatDate(call.createdAt)}</p></div>))}</div>}
          </div>
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">Upcoming Appointments</h2><Link href="/calendar"><Button variant="ghost" size="sm">View All</Button></Link></div>
            {upcomingAppts.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center m-4"><CalendarDays className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">No upcoming appointments</p></div>
            : <div className="divide-y">{upcomingAppts.map((appt) => (<div key={appt.id} className="flex items-center justify-between p-4"><div><p className="font-medium">{appt.title}</p><p className="text-sm text-gray-500">{appt.customerName}</p></div><div className="text-right"><p className="text-sm font-medium">{formatDate(appt.date)}</p><p className="text-sm text-gray-500">{appt.time}</p></div></div>))}</div>}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/jobs?new=true"><Button><Briefcase className="mr-2 h-4 w-4" />New Job</Button></Link>
            <Link href="/customers?new=true"><Button variant="outline"><Users className="mr-2 h-4 w-4" />New Customer</Button></Link>
            <Link href="/invoices?new=true"><Button variant="outline"><Receipt className="mr-2 h-4 w-4" />New Invoice</Button></Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
