"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string,string> = { draft:"bg-gray-100 text-gray-700", sent:"bg-blue-100 text-blue-700", accepted:"bg-green-100 text-green-700", declined:"bg-red-100 text-red-700" };
interface Quote { id:string; customerName:string; total:number; status:string; createdAt:string }
interface LineItem { description:string; qty:number; rate:number }

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("hourly");
  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ description: "", qty: 1, rate: 0 }]);

  const fetchQuotes = async (q="") => { setLoading(true); try { const res = await fetch(`/api/quotes?search=${encodeURIComponent(q)}`); if (res.ok) setQuotes(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchQuotes(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchQuotes(search), 300); return () => clearTimeout(t); }, [search]);

  const addLine = () => setLines([...lines, { description: "", qty: 1, rate: 0 }]);
  const removeLine = (i:number) => setLines(lines.filter((_,idx) => idx !== i));
  const updateLine = (i:number, field:keyof LineItem, value:any) => { const u = [...lines]; (u[i] as any)[field] = value; setLines(u); };
  const subtotal = lines.reduce((s,l) => s + l.qty * l.rate, 0);

  const handleSave = async () => { setSaving(true); try { const res = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, mode, lines, total: subtotal }) }); if (res.ok) { toast.success("Quote created"); setDialogOpen(false); setLines([{ description: "", qty: 1, rate: 0 }]); setCustomerName(""); fetchQuotes(search); } else { toast.error("Failed"); } } catch { toast.error("Failed"); } finally { setSaving(false); } };

  return (
    <DashboardLayout title="Quotes">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />New Quote</Button>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : quotes.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No quotes yet</p><Button onClick={() => setDialogOpen(true)}>Create First Quote</Button></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th><th className="px-4 py-3 text-left font-medium text-gray-500">Total</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th></tr></thead><tbody className="divide-y">{quotes.map(q => <tr key={q.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{q.customerName}</td><td className="px-4 py-3">{formatCurrency(q.total)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[q.status]||"bg-gray-100"}`}>{q.status}</span></td><td className="px-4 py-3">{formatDate(q.createdAt)}</td></tr>)}</tbody></table></div>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Quote</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Customer</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} /></div><div className="space-y-2"><Label>Pricing Mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="sqft">Per Sq Ft</SelectItem></SelectContent></Select></div></div>
          <div><Label className="mb-2 block">Line Items</Label><div className="space-y-2">{lines.map((line, i) => <div key={i} className="flex gap-2 items-center"><Input placeholder="Description" value={line.description} onChange={e => updateLine(i,"description",e.target.value)} className="flex-1" /><Input type="number" value={line.qty} onChange={e => updateLine(i,"qty",Number(e.target.value))} className="w-20" /><Input type="number" value={line.rate} onChange={e => updateLine(i,"rate",Number(e.target.value))} className="w-24" /><span className="w-24 text-right text-sm font-medium">{formatCurrency(line.qty*line.rate)}</span><Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length===1}><Trash2 className="h-4 w-4" /></Button></div>)}</div><Button variant="ghost" size="sm" onClick={addLine} className="mt-2"><Plus className="mr-1 h-4 w-4" />Add Line</Button></div>
          <div className="flex justify-end border-t pt-3"><div className="text-right"><p className="text-sm text-gray-500">Subtotal</p><p className="text-xl font-bold">{formatCurrency(subtotal)}</p></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </DashboardLayout>
  );
}
