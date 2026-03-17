"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatPhone } from "@/lib/utils";
import { Users, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Customer { id: string; name: string; phone: string; email: string; jobCount: number; createdAt: string }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  const fetchCustomers = async (q = "") => { setLoading(true); try { const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`); if (res.ok) setCustomers(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchCustomers(search), 300); return () => clearTimeout(t); }, [search]);

  const handleSave = async () => {
    setSaving(true);
    try { const res = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { toast.success("Customer created"); setDialogOpen(false); setForm({ name: "", phone: "", email: "", address: "", notes: "" }); fetchCustomers(search); } else { toast.error("Failed to create customer"); }
    } catch { toast.error("Failed to create customer"); } finally { setSaving(false); }
  };

  return (
    <DashboardLayout title="Customers">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : customers.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><Users className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No customers yet</p><Button onClick={() => setDialogOpen(true)}>Add First Customer</Button></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Name</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Phone</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Email</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell"># Jobs</th><th className="px-4 py-3 text-left font-medium text-gray-500">Created</th></tr></thead>
          <tbody className="divide-y">{customers.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-4 py-3"><Link href={`/customers/${c.id}`} className="font-medium text-[#DC7418] hover:underline">{c.name}</Link></td><td className="px-4 py-3 hidden md:table-cell">{formatPhone(c.phone)}</td><td className="px-4 py-3 hidden sm:table-cell">{c.email}</td><td className="px-4 py-3 hidden lg:table-cell">{c.jobCount}</td><td className="px-4 py-3">{formatDate(c.createdAt)}</td></tr>)}</tbody></table></div>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div></div>
          <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
          <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </DashboardLayout>
  );
}
