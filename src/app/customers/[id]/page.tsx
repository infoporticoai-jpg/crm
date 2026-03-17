"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatPhone, formatCurrency } from "@/lib/utils";
import { User, Phone, Mail, MapPin, StickyNote, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

interface Customer { id: string; name: string; phone: string; email: string; address: string; notes: string; createdAt: string }

export default function CustomerDetailPage() {
  const { id } = useParams() as { id: string };
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [cr, jr, ir, qr, clr, ar] = await Promise.all([fetch(`/api/customers/${id}`), fetch(`/api/customers/${id}/jobs`), fetch(`/api/customers/${id}/invoices`), fetch(`/api/customers/${id}/quotes`), fetch(`/api/customers/${id}/calls`), fetch(`/api/customers/${id}/appointments`)]);
        if (cr.ok) { const d = await cr.json(); setCustomer(d); setForm(d); }
        if (jr.ok) setJobs(await jr.json()); if (ir.ok) setInvoices(await ir.json()); if (qr.ok) setQuotes(await qr.json()); if (clr.ok) setCalls(await clr.json()); if (ar.ok) setAppointments(await ar.json());
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  const handleSave = async () => {
    try { const res = await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { const updated = await res.json(); setCustomer(updated); setEditing(false); toast.success("Customer updated"); } else { toast.error("Failed to update"); }
    } catch { toast.error("Failed to update"); }
  };

  if (loading) return <DashboardLayout title="Customer Detail"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;
  if (!customer) return <DashboardLayout title="Customer Detail"><p>Customer not found</p></DashboardLayout>;

  return (
    <DashboardLayout title={customer.name}>
      <div className="space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Information</h2>
            {editing ? <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(customer); }}><X className="mr-1 h-4 w-4" />Cancel</Button><Button size="sm" onClick={handleSave}><Save className="mr-1 h-4 w-4" />Save</Button></div>
            : <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>}
          </div>
          {editing ? <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name||""} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone||""} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email||""} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address||""} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Input value={form.notes||""} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
          </div>
          : <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-gray-400" />{customer.name}</div>
            <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-gray-400" />{formatPhone(customer.phone)}</div>
            <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-gray-400" />{customer.email}</div>
            <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-gray-400" />{customer.address}</div>
            {customer.notes && <div className="flex items-start gap-2 text-sm sm:col-span-2"><StickyNote className="h-4 w-4 text-gray-400 mt-0.5" />{customer.notes}</div>}
          </div>}
        </div>
        <Tabs defaultValue="jobs">
          <TabsList><TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger><TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger><TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger><TabsTrigger value="calls">Calls ({calls.length})</TabsTrigger><TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger></TabsList>
          <TabsContent value="jobs">{jobs.length === 0 ? <p className="py-8 text-center text-gray-500">No jobs</p> : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Title</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th></tr></thead><tbody className="divide-y">{jobs.map((j:any) => <tr key={j.id} className="hover:bg-gray-50"><td className="px-4 py-3"><Link href={`/jobs/${j.id}`} className="text-[#DC7418] hover:underline">{j.title}</Link></td><td className="px-4 py-3">{j.status}</td><td className="px-4 py-3">{formatDate(j.createdAt)}</td></tr>)}</tbody></table></div>}</TabsContent>
          <TabsContent value="invoices">{invoices.length === 0 ? <p className="py-8 text-center text-gray-500">No invoices</p> : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Total</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th></tr></thead><tbody className="divide-y">{invoices.map((inv:any) => <tr key={inv.id} className="hover:bg-gray-50"><td className="px-4 py-3">{inv.number}</td><td className="px-4 py-3">{formatCurrency(inv.total)}</td><td className="px-4 py-3">{inv.status}</td><td className="px-4 py-3">{formatDate(inv.createdAt)}</td></tr>)}</tbody></table></div>}</TabsContent>
          <TabsContent value="quotes">{quotes.length === 0 ? <p className="py-8 text-center text-gray-500">No quotes</p> : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Total</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th></tr></thead><tbody className="divide-y">{quotes.map((q:any) => <tr key={q.id} className="hover:bg-gray-50"><td className="px-4 py-3">{q.number}</td><td className="px-4 py-3">{formatCurrency(q.total)}</td><td className="px-4 py-3">{q.status}</td></tr>)}</tbody></table></div>}</TabsContent>
          <TabsContent value="calls">{calls.length === 0 ? <p className="py-8 text-center text-gray-500">No calls</p> : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Type</th><th className="px-4 py-3 text-left font-medium text-gray-500">Duration</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th></tr></thead><tbody className="divide-y">{calls.map((c:any) => <tr key={c.id} className="hover:bg-gray-50"><td className="px-4 py-3">{c.damageType}</td><td className="px-4 py-3">{c.duration}s</td><td className="px-4 py-3">{formatDate(c.createdAt)}</td></tr>)}</tbody></table></div>}</TabsContent>
          <TabsContent value="appointments">{appointments.length === 0 ? <p className="py-8 text-center text-gray-500">No appointments</p> : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Title</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th><th className="px-4 py-3 text-left font-medium text-gray-500">Time</th></tr></thead><tbody className="divide-y">{appointments.map((a:any) => <tr key={a.id} className="hover:bg-gray-50"><td className="px-4 py-3">{a.title}</td><td className="px-4 py-3">{formatDate(a.date)}</td><td className="px-4 py-3">{a.time}</td></tr>)}</tbody></table></div>}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
