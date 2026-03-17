"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { UserPlus, Plus, Pencil, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

interface Technician { id:string; name:string; phone:string; email:string; certifications:string; hourlyRate:number }

export default function TeamPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ name:"", phone:"", email:"", certifications:"", hourlyRate:0 });

  const fetchTeam = async () => { setLoading(true); try { const res = await fetch("/api/team"); if (res.ok) setTechnicians(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchTeam(); }, []);

  const openAdd = () => { setEditId(null); setForm({ name:"",phone:"",email:"",certifications:"",hourlyRate:0 }); setDialogOpen(true); };
  const label = "Team Member";
  const openEdit = (tech:Technician) => { setEditId(tech.id); setForm({ name:tech.name, phone:tech.phone, email:tech.email, certifications:tech.certifications, hourlyRate:tech.hourlyRate }); setDialogOpen(true); };

  const handleSave = async () => { setSaving(true); try { const url = editId ? `/api/team/${editId}` : "/api/team"; const method = editId ? "PATCH" : "POST"; const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { toast.success(editId ? "Updated" : "Added"); setDialogOpen(false); fetchTeam(); } else { toast.error("Failed"); } } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const handleDelete = async (id:string) => { if (!confirm("Remove this team member?")) return; try { const res = await fetch(`/api/team/${id}`, { method: "DELETE" }); if (res.ok) { toast.success("Removed"); fetchTeam(); } } catch { toast.error("Failed"); } };
  const handleInvite = async (id:string) => { try { const res = await fetch(`/api/team/${id}/invite`, { method: "POST" }); if (res.ok) toast.success("Invitation sent"); else toast.error("Failed"); } catch { toast.error("Failed"); } };

  return (
    <DashboardLayout title="Team">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Team Member</Button></div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : technicians.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No team members yet</p><Button onClick={openAdd}>Add First Team Member</Button></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Name</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Phone</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Email</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Certifications</th><th className="px-4 py-3 text-left font-medium text-gray-500">Hourly Rate</th><th className="px-4 py-3 w-32"></th></tr></thead>
          <tbody className="divide-y">{technicians.map(tech => <tr key={tech.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{tech.name}</td><td className="px-4 py-3 hidden sm:table-cell">{tech.phone}</td><td className="px-4 py-3 hidden md:table-cell">{tech.email}</td><td className="px-4 py-3 hidden lg:table-cell">{tech.certifications}</td><td className="px-4 py-3">{formatCurrency(tech.hourlyRate)}/hr</td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(tech)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(tech.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button><Button variant="ghost" size="icon" onClick={() => handleInvite(tech.id)}><Send className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editId ? "Edit Team Member" : "Add Team Member"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} required /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone:e.target.value}))} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} /></div></div>
          <div className="space-y-2"><Label>Certifications</Label><Input value={form.certifications} onChange={e => setForm(f => ({...f, certifications:e.target.value}))} placeholder="IICRC, WRT, ..." /></div>
          <div className="space-y-2"><Label>Hourly Rate</Label><Input type="number" value={form.hourlyRate} onChange={e => setForm(f => ({...f, hourlyRate:Number(e.target.value)}))} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </DashboardLayout>
  );
}
