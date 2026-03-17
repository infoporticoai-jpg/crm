"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Wallet, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

interface PayrollEntry { id:string; technicianId:string; technicianName:string; hours:number; rate:number; total:number; date:string }
interface Technician { id:string; name:string; hourlyRate:number }

export default function PayrollPage() {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ technicianId: "", hours: 0, date: "" });

  const fetchData = async () => { setLoading(true); try { const [er, tr] = await Promise.all([fetch("/api/payroll"), fetch("/api/team")]); if (er.ok) setEntries(await er.json()); if (tr.ok) setTechnicians(await tr.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const grouped = entries.reduce<Record<string,{name:string;hours:number;rate:number;total:number;entries:PayrollEntry[]}>>((acc,e) => { if (!acc[e.technicianId]) acc[e.technicianId] = {name:e.technicianName,hours:0,rate:e.rate,total:0,entries:[]}; acc[e.technicianId].hours += e.hours; acc[e.technicianId].total += e.total; acc[e.technicianId].entries.push(e); return acc; }, {});

  const handleSave = async () => { setSaving(true); try { const res = await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { toast.success("Hours added"); setDialogOpen(false); setForm({ technicianId: "", hours: 0, date: "" }); fetchData(); } else { toast.error("Failed"); } } catch { toast.error("Failed"); } finally { setSaving(false); } };

  return (
    <DashboardLayout title="Payroll">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Hours</Button></div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : Object.keys(grouped).length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No payroll records yet</p><Button onClick={() => setDialogOpen(true)}>Add First Entry</Button></div>
        : <div className="space-y-4">{Object.entries(grouped).map(([techId, data]) => <div key={techId} className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b p-4"><div><h3 className="font-semibold">{data.name}</h3><p className="text-sm text-gray-500">{data.hours} hrs @ {formatCurrency(data.rate)}/hr = {formatCurrency(data.total)}</p></div><Button variant="outline" size="sm" onClick={() => fetch(`/api/payroll/${techId}/payslip`,{method:"POST"}).then(() => toast.success("Pay slip generated"))}><FileText className="mr-1 h-4 w-4" />Generate Pay Slip</Button></div>
            <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left font-medium text-gray-500">Date</th><th className="px-4 py-2 text-left font-medium text-gray-500">Hours</th><th className="px-4 py-2 text-left font-medium text-gray-500">Total</th></tr></thead><tbody className="divide-y">{data.entries.map(e => <tr key={e.id} className="hover:bg-gray-50"><td className="px-4 py-2">{e.date}</td><td className="px-4 py-2">{e.hours}</td><td className="px-4 py-2">{formatCurrency(e.total)}</td></tr>)}</tbody></table>
          </div>)}</div>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Hours</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Technician</Label><Select value={form.technicianId} onValueChange={v => setForm(f => ({...f, technicianId: v}))}><SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger><SelectContent>{technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Hours Worked</Label><Input type="number" value={form.hours} onChange={e => setForm(f => ({...f, hours: Number(e.target.value)}))} /></div><div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </DashboardLayout>
  );
}
