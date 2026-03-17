"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Customer { id:string; name:string }

export default function NewFlooringPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ projectRef:"", projectName:"", contactName:"", location:"", customerId:"" });

  useEffect(() => { (async () => { try { const res = await fetch("/api/customers?limit=100"); if (res.ok) setCustomers(await res.json()); } catch {} })(); }, []);

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/flooring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { toast.error("Failed to create project"); return; }
      const project = await res.json();
      try { await fetch("/api/flooring/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, projectRef: project.projectRef, projectName: project.projectName, contactName: project.contactName, location: project.location, status: "NOUVEAU" }) }); } catch {}
      toast.success("Project created"); router.push(`/flooring/${project.id}`);
    } catch { toast.error("Failed to create project"); } finally { setSaving(false); }
  };

  return (
    <DashboardLayout title="New Flooring Project">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Project Reference</Label><Input value={form.projectRef} onChange={e => setForm(f => ({...f, projectRef:e.target.value}))} placeholder="SOL-2026-001" required /></div>
            <div className="space-y-2"><Label>Project Name</Label><Input value={form.projectName} onChange={e => setForm(f => ({...f, projectName:e.target.value}))} required /></div>
            <div className="space-y-2"><Label>Contact Name</Label><Input value={form.contactName} onChange={e => setForm(f => ({...f, contactName:e.target.value}))} required /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({...f, location:e.target.value}))} required /></div>
            <div className="space-y-2"><Label>Customer (optional)</Label><Select value={form.customerId} onValueChange={v => setForm(f => ({...f, customerId:v}))}><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => router.push("/flooring")}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Project"}</Button></div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
