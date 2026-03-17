"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, DollarSign } from "lucide-react";

interface AnalyticsData { revenueVsCost:{month:string;revenue:number;cost:number}[]; jobBreakdown:{type:string;count:number;percentage:number}[]; funnel:{stage:string;count:number}[]; revenueTrend:{month:string;revenue:number}[]; avgJobValue:number; totalJobs:number }

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { setLoading(true); try { const res = await fetch("/api/analytics"); if (res.ok) setData(await res.json()); } finally { setLoading(false); } })(); }, []);

  if (loading) return <DashboardLayout title="Analytics"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;
  if (!data) return <DashboardLayout title="Analytics"><div className="border-2 border-dashed rounded-xl p-12 text-center"><BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">No analytics data available yet</p></div></DashboardLayout>;

  const maxRevCost = Math.max(...data.revenueVsCost.flatMap(d => [d.revenue, d.cost]), 1);
  const maxTrend = Math.max(...data.revenueTrend.map(d => d.revenue), 1);
  const maxFunnel = Math.max(...data.funnel.map(d => d.count), 1);

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign className="h-4 w-4 text-[#DC7418]" />Avg Job Value</div><p className="mt-1 text-2xl font-bold">{formatCurrency(data.avgJobValue)}</p></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm text-gray-500"><BarChart3 className="h-4 w-4 text-[#DC7418]" />Total Jobs</div><p className="mt-1 text-2xl font-bold">{data.totalJobs}</p></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="font-semibold mb-4">Revenue vs Cost</h3><div className="space-y-3">{data.revenueVsCost.map(d => <div key={d.month} className="space-y-1"><div className="flex justify-between text-xs text-gray-500"><span>{d.month}</span><span>{formatCurrency(d.revenue)} / {formatCurrency(d.cost)}</span></div><div className="flex gap-1 h-4"><div className="bg-green-400 rounded" style={{width:`${(d.revenue/maxRevCost)*100}%`}} /><div className="bg-red-400 rounded" style={{width:`${(d.cost/maxRevCost)*100}%`}} /></div></div>)}</div><div className="flex gap-4 mt-4 text-xs"><div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-green-400" />Revenue</div><div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-red-400" />Cost</div></div></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="font-semibold mb-4">Job Type Breakdown</h3><div className="space-y-3">{data.jobBreakdown.map(d => <div key={d.type}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{d.type}</span><span className="text-gray-500">{d.count} ({d.percentage}%)</span></div><div className="h-3 w-full rounded-full bg-gray-100"><div className="h-3 rounded-full bg-[#DC7418]" style={{width:`${d.percentage}%`}} /></div></div>)}</div></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="font-semibold mb-4">Conversion Funnel</h3><div className="space-y-2">{data.funnel.map((stage,i) => <div key={stage.stage} className="flex items-center gap-3"><span className="w-24 text-sm text-gray-600 capitalize">{stage.stage}</span><div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden"><div className="h-full bg-[#DC7418] rounded-lg flex items-center justify-end pr-2" style={{width:`${(stage.count/maxFunnel)*100}%`,opacity:1-i*0.15}}><span className="text-xs font-medium text-white">{stage.count}</span></div></div></div>)}</div></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="font-semibold mb-4">6-Month Revenue Trend</h3><div className="flex items-end gap-2 h-48">{data.revenueTrend.map(d => <div key={d.month} className="flex-1 flex flex-col items-center gap-1"><span className="text-xs font-medium">{formatCurrency(d.revenue)}</span><div className="w-full bg-[#DC7418] rounded-t-md" style={{height:`${(d.revenue/maxTrend)*160}px`}} /><span className="text-xs text-gray-500">{d.month}</span></div>)}</div></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
