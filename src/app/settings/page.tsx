"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Clock, MapPin, Users, Bot, Plug } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState({ name:"", phone:"", address:"", email:"", logo:"" });
  const [hours, setHours] = useState<Record<string,{open:string;close:string}>>(Object.fromEntries(DAYS.map(d => [d, {open:"08:00",close:"17:00"}])));
  const [serviceArea, setServiceArea] = useState({ radius: 50, zipCodes: "" });
  const [aiConfig, setAiConfig] = useState({ greeting: "", settings: "" });
  const [integrations, setIntegrations] = useState({ googleCalendar: false, n8nKey: "", zapierUrl: "", retellKey: "" });

  useEffect(() => { (async () => { setLoading(true); try { const res = await fetch("/api/settings"); if (res.ok) { const data = await res.json(); if (data.company) setCompany(data.company); if (data.hours) setHours(data.hours); if (data.serviceArea) setServiceArea(data.serviceArea); if (data.aiConfig) setAiConfig(data.aiConfig); if (data.integrations) setIntegrations(data.integrations); } } finally { setLoading(false); } })(); }, []);

  const saveSection = async (section:string, data:any) => { setSaving(true); try { const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, data }) }); if (res.ok) toast.success("Settings saved"); else toast.error("Failed to save settings"); } catch { toast.error("Failed to save settings"); } finally { setSaving(false); } };

  if (loading) return <DashboardLayout title="Settings"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;

  return (
    <DashboardLayout title="Settings">
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company"><Building2 className="mr-1 h-4 w-4" />Company</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="mr-1 h-4 w-4" />Hours</TabsTrigger>
          <TabsTrigger value="serviceArea"><MapPin className="mr-1 h-4 w-4" />Service Area</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-1 h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="aiConfig"><Bot className="mr-1 h-4 w-4" />AI Config</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="mr-1 h-4 w-4" />Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="company"><div className="rounded-xl border bg-white p-6 shadow-sm space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Company Name</Label><Input value={company.name} onChange={e => setCompany(c => ({...c, name:e.target.value}))} /></div><div className="space-y-2"><Label>Phone</Label><Input value={company.phone} onChange={e => setCompany(c => ({...c, phone:e.target.value}))} /></div><div className="space-y-2"><Label>Email</Label><Input value={company.email} onChange={e => setCompany(c => ({...c, email:e.target.value}))} /></div><div className="space-y-2"><Label>Logo URL</Label><Input value={company.logo} onChange={e => setCompany(c => ({...c, logo:e.target.value}))} /></div><div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={company.address} onChange={e => setCompany(c => ({...c, address:e.target.value}))} /></div></div><Button onClick={() => saveSection("company",company)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div></TabsContent>
        <TabsContent value="hours"><div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">{DAYS.map(day => <div key={day} className="flex items-center gap-4"><span className="w-28 text-sm font-medium">{day}</span><div className="flex items-center gap-2"><Label className="text-xs">Open</Label><Input type="time" value={hours[day]?.open||"08:00"} onChange={e => setHours(h => ({...h,[day]:{...h[day],open:e.target.value}}))} className="w-32" /></div><div className="flex items-center gap-2"><Label className="text-xs">Close</Label><Input type="time" value={hours[day]?.close||"17:00"} onChange={e => setHours(h => ({...h,[day]:{...h[day],close:e.target.value}}))} className="w-32" /></div></div>)}<Button onClick={() => saveSection("hours",hours)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div></TabsContent>
        <TabsContent value="serviceArea"><div className="rounded-xl border bg-white p-6 shadow-sm space-y-4"><div className="space-y-2"><Label>Service Radius (km)</Label><Input type="number" value={serviceArea.radius} onChange={e => setServiceArea(s => ({...s, radius:Number(e.target.value)}))} /></div><div className="space-y-2"><Label>ZIP / Postal Codes (comma-separated)</Label><Textarea value={serviceArea.zipCodes} onChange={e => setServiceArea(s => ({...s, zipCodes:e.target.value}))} placeholder="H2X 1Y4, H3A 2T5, ..." /></div><Button onClick={() => saveSection("serviceArea",serviceArea)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div></TabsContent>
        <TabsContent value="team"><div className="rounded-xl border bg-white p-6 shadow-sm"><p className="text-sm text-gray-500">Manage technicians in the <a href="/team" className="text-[#DC7418] hover:underline">Team page</a>.</p></div></TabsContent>
        <TabsContent value="aiConfig"><div className="rounded-xl border bg-white p-6 shadow-sm space-y-4"><div className="space-y-2"><Label>AI Greeting</Label><Textarea value={aiConfig.greeting} onChange={e => setAiConfig(c => ({...c, greeting:e.target.value}))} placeholder="Hello! Thank you for calling..." /></div><div className="space-y-2"><Label>Additional AI Settings</Label><Textarea value={aiConfig.settings} onChange={e => setAiConfig(c => ({...c, settings:e.target.value}))} /></div><Button onClick={() => saveSection("aiConfig",aiConfig)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div></TabsContent>
        <TabsContent value="integrations"><div className="rounded-xl border bg-white p-6 shadow-sm space-y-4"><div className="flex items-center justify-between p-4 rounded-lg border"><div><p className="font-medium">Google Calendar</p><p className="text-sm text-gray-500">{integrations.googleCalendar ? "Connected" : "Not connected"}</p></div><Button variant={integrations.googleCalendar ? "destructive" : "default"} size="sm" onClick={() => setIntegrations(i => ({...i, googleCalendar:!i.googleCalendar}))}>{integrations.googleCalendar ? "Disconnect" : "Connect"}</Button></div><div className="space-y-2"><Label>n8n Webhook Key</Label><Input value={integrations.n8nKey} onChange={e => setIntegrations(i => ({...i, n8nKey:e.target.value}))} type="password" /></div><div className="space-y-2"><Label>Zapier Webhook URL</Label><Input value={integrations.zapierUrl} onChange={e => setIntegrations(i => ({...i, zapierUrl:e.target.value}))} /></div><div className="space-y-2"><Label>Retell API Key</Label><Input value={integrations.retellKey} onChange={e => setIntegrations(i => ({...i, retellKey:e.target.value}))} type="password" /></div><Button onClick={() => saveSection("integrations",integrations)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
