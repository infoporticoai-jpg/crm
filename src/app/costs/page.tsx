"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { DollarSign, Plus, Download, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface Entry { id:string; name:string; amount:number; date:string; type:string; category:"cost"|"revenue" }

export default function CostsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cost"|"revenue">("cost");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", amount: 0, date: "", type: "labor", category: "cost" as "cost"|"revenue" });

  const fetchEntries = async () => { setLoading(true); try { const res = await fetch("/api/costs"); if (res.ok) setEntries(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchEntries(); }, []);

  const filtered = entries.filter(e => e.category === tab);
  const totalCosts = entries.filter(e => e.category === "cost").reduce((s,e) => s+e.amount, 0);
  const totalRevenue = entries.filter(e => e.category === "revenue").reduce((s,e) => s+e.amount, 0);
  const profit = totalRevenue - totalCosts;

  const handleSave = async () => { setSaving(true); try { const res = await fetch("/api/costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...form, category: tab}) }); if (res.ok) { toast.success("Entry added"); setDialogOpen(false); setForm({ name: "", amount: 0, date: "", type: "labor", category: "cost" }); fetchEntries(); } else { toast.error("Failed"); } } catch { toast.error("Failed"); } finally { setSaving(false); } };

  return (
    <DashboardLayout title="Costs & Revenue">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm text-gray-500"><TrendingDown className="h-4 w-4 text-red-500" />Total Costs</div><p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalCosts)}</p></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm text-gray-500"><TrendingUp className="h-4 w-4 text-green-500" />Total Revenue</div><p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign className="h-4 w-4 text-[#DC7418]" />Profit</div><p className={`mt-1 text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(profit)}</p></div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg border"><button onClick={() => setTab("cost")} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${tab==="cost" ? "bg-[#DC7418] text-white" : "text-gray-600 hover:bg-gray-100"}`}>Costs</button><button onClick={() => setTab("revenue")} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${tab==="revenue" ? "bg-[#DC7418] text-white" : "text-gray-600 hover:bg-gray-100"}`}>Revenue</button></div>
          <div className="flex gap-2"><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export PDF</Button><Button onClick={() => { setForm(f => ({...f, category: tab})); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Entry</Button></div>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : filtered.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No entries yet</p><Button onClick={() => setDialogOpen(true)}>Add First Entry</Button></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Name</th><th className="px-4 py-3 text-left font-medium text-gray-500">Amount</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Type</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th></tr></thead><tbody className="divide-y">{filtered.map(e => <tr key={e.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{e.name}</td><td className="px-4 py-3">{formatCurrency(e.amount)}</td><td className="px-4 py-3 capitalize hidden sm:table-cell">{e.type}</td><td className="px-4 py-3">{formatDate(e.date)}</td></tr>)}</tbody></table></div>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Entry</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: Number(e.target.value)}))} /></div><div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div></div>
          <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="labor">Labor</SelectItem><SelectItem value="material">Material</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="subcontractor">Subcontractor</SelectItem><SelectItem value="overhead">Overhead</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </DashboardLayout>
  );
}
