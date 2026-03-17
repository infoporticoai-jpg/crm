"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Briefcase, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = { lead: "bg-gray-100 text-gray-700", scheduled: "bg-blue-100 text-blue-700", in_progress: "bg-yellow-100 text-yellow-700", completed: "bg-green-100 text-green-700", invoiced: "bg-purple-100 text-purple-700", paid: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700" };
const STATUSES = ["lead", "scheduled", "in_progress", "completed", "invoiced", "paid", "cancelled"];
interface Job { id: string; title: string; customerName: string; status: string; damageType: string; createdAt: string }

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", customerId: "", damageType: "", description: "", address: "" });

  const fetchJobs = async (q = "", status = "all") => { setLoading(true); try { const p = new URLSearchParams(); if (q) p.set("search", q); if (status !== "all") p.set("status", status); const res = await fetch(`/api/jobs?${p}`); if (res.ok) setJobs(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchJobs(search, statusFilter), 300); return () => clearTimeout(t); }, [search, statusFilter]);

  const handleSave = async () => { setSaving(true); try { const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { toast.success("Job created"); setDialogOpen(false); setForm({ title: "", customerId: "", damageType: "", description: "", address: "" }); fetchJobs(search, statusFilter); } else { toast.error("Failed to create job"); } } catch { toast.error("Failed to create job"); } finally { setSaving(false); } };

  return (
    <DashboardLayout title="Jobs">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent></Select></div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Job</Button>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : jobs.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No jobs yet</p><Button onClick={() => setDialogOpen(true)}>Add First Job</Button></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Title</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Customer</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Damage Type</th><th className="px-4 py-3 text-left font-medium text-gray-500">Created</th></tr></thead>
          <tbody className="divide-y">{jobs.map(job => <tr key={job.id} className="hover:bg-gray-50"><td className="px-4 py-3"><Link href={`/jobs/${job.id}`} className="font-medium text-[#DC7418] hover:underline">{job.title}</Link></td><td className="px-4 py-3 hidden sm:table-cell">{job.customerName}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[job.status]||"bg-gray-100 text-gray-700"}`}>{job.status.replace("_"," ")}</span></td><td className="px-4 py-3 hidden md:table-cell">{job.damageType}</td><td className="px-4 py-3">{formatDate(job.createdAt)}</td></tr>)}</tbody></table></div>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Job</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
          <div className="space-y-2"><Label>Damage Type</Label><Select value={form.damageType} onValueChange={v => setForm(f => ({...f, damageType: v}))}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="water">Water Damage</SelectItem><SelectItem value="fire">Fire Damage</SelectItem><SelectItem value="mold">Mold</SelectItem><SelectItem value="storm">Storm</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Property Address</Label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
          <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </DashboardLayout>
  );
}
