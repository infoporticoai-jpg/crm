"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface OverdueInvoice { id:string; customerName:string; amount:number; dueDate:string; daysOverdue:number }
interface AgingData { total:number; days30:number; days60:number; days90:number }

export default function RevenueRecoveryPage() {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);
  const [aging, setAging] = useState<AgingData>({ total:0, days30:0, days60:0, days90:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { setLoading(true); try { const [ir, ar] = await Promise.all([fetch("/api/revenue-recovery/overdue"), fetch("/api/revenue-recovery/aging")]); if (ir.ok) setInvoices(await ir.json()); if (ar.ok) setAging(await ar.json()); } finally { setLoading(false); } })(); }, []);

  const sendReminder = async (id:string) => { try { const res = await fetch(`/api/revenue-recovery/${id}/remind`, { method: "POST" }); if (res.ok) toast.success("Reminder sent"); else toast.error("Failed"); } catch { toast.error("Failed"); } };
  const overdueColor = (d:number) => d >= 90 ? "text-red-600" : d >= 60 ? "text-orange-600" : "text-yellow-600";

  if (loading) return <DashboardLayout title="Revenue Recovery"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;

  return (
    <DashboardLayout title="Revenue Recovery">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><p className="text-sm text-gray-500">Total Outstanding</p><p className="mt-1 text-2xl font-bold text-[#DC7418]">{formatCurrency(aging.total)}</p></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><p className="text-sm text-gray-500">30 Days</p><p className="mt-1 text-2xl font-bold text-yellow-600">{formatCurrency(aging.days30)}</p></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><p className="text-sm text-gray-500">60 Days</p><p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(aging.days60)}</p></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><p className="text-sm text-gray-500">90+ Days</p><p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(aging.days90)}</p></div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="font-semibold mb-3">Aging Breakdown</h3><div className="flex h-6 rounded-full overflow-hidden bg-gray-100">{aging.total > 0 && <><div className="bg-yellow-400" style={{width:`${(aging.days30/aging.total)*100}%`}} /><div className="bg-orange-400" style={{width:`${(aging.days60/aging.total)*100}%`}} /><div className="bg-red-400" style={{width:`${(aging.days90/aging.total)*100}%`}} /></>}</div><div className="flex gap-4 mt-2 text-xs"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400" />30 days</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-400" />60 days</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-400" />90+ days</span></div></div>
        <div><h3 className="font-semibold mb-3">Overdue Invoices</h3>
          {invoices.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">No overdue invoices</p></div>
          : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th><th className="px-4 py-3 text-left font-medium text-gray-500">Amount</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Due Date</th><th className="px-4 py-3 text-left font-medium text-gray-500">Days Overdue</th><th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th></tr></thead>
            <tbody className="divide-y">{invoices.map(inv => <tr key={inv.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{inv.customerName}</td><td className="px-4 py-3">{formatCurrency(inv.amount)}</td><td className="px-4 py-3 hidden sm:table-cell">{formatDate(inv.dueDate)}</td><td className="px-4 py-3"><span className={`flex items-center gap-1 font-medium ${overdueColor(inv.daysOverdue)}`}><AlertTriangle className="h-3 w-3" />{inv.daysOverdue}d</span></td><td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => sendReminder(inv.id)}><Send className="h-4 w-4 mr-1" />Send Reminder</Button></td></tr>)}</tbody></table></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
