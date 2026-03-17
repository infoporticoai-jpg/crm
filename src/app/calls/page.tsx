"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatPhone } from "@/lib/utils";
import { Phone, Download, ChevronDown, ChevronUp, Search } from "lucide-react";

interface Call { id: string; callerName: string; phone: string; damageType: string; urgency: string; duration: number; createdAt: string; transcript?: string; recordingUrl?: string }

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [damageFilter, setDamageFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCalls = async (q = "", damage = "all") => {
    setLoading(true);
    try { const p = new URLSearchParams(); if (q) p.set("search", q); if (damage !== "all") p.set("damageType", damage); const res = await fetch(`/api/calls?${p}`); if (res.ok) setCalls(await res.json()); } finally { setLoading(false); }
  };
  useEffect(() => { fetchCalls(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchCalls(search, damageFilter), 300); return () => clearTimeout(t); }, [search, damageFilter]);

  const exportCSV = () => {
    const rows = ["Caller,Phone,Damage Type,Urgency,Duration (s),Date", ...calls.map(c => `"${c.callerName}","${c.phone}","${c.damageType}","${c.urgency}",${c.duration},"${c.createdAt}"`)].join("\n");
    const blob = new Blob([rows], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `calls-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const urgencyColor = (u: string) => { switch(u?.toLowerCase()) { case "high": return "bg-red-100 text-red-700"; case "medium": return "bg-yellow-100 text-yellow-700"; default: return "bg-green-100 text-green-700"; } };

  return (
    <DashboardLayout title="Calls">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder="Search calls..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={damageFilter} onValueChange={setDamageFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="water">Water Damage</SelectItem><SelectItem value="fire">Fire Damage</SelectItem><SelectItem value="mold">Mold</SelectItem><SelectItem value="storm">Storm</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : calls.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">No calls recorded yet</p></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Caller</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Phone</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Damage Type</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Urgency</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Duration</th><th className="px-4 py-3 text-left font-medium text-gray-500">Date</th><th className="px-4 py-3 w-10"></th></tr></thead>
              <tbody className="divide-y">{calls.map((call) => (<>
                <tr key={call.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}>
                  <td className="px-4 py-3 font-medium">{call.callerName}</td><td className="px-4 py-3 hidden md:table-cell">{formatPhone(call.phone)}</td><td className="px-4 py-3 hidden sm:table-cell">{call.damageType}</td>
                  <td className="px-4 py-3 hidden lg:table-cell"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${urgencyColor(call.urgency)}`}>{call.urgency}</span></td>
                  <td className="px-4 py-3 hidden lg:table-cell">{call.duration}s</td><td className="px-4 py-3">{formatDate(call.createdAt)}</td>
                  <td className="px-4 py-3">{expandedId === call.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</td>
                </tr>
                {expandedId === call.id && <tr key={`${call.id}-detail`}><td colSpan={7} className="bg-gray-50 px-4 py-4"><div className="space-y-3">{call.transcript && <div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">Transcript</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{call.transcript}</p></div>}{call.recordingUrl && <div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">Recording</p><audio controls src={call.recordingUrl} className="w-full max-w-md" /></div>}</div></td></tr>}
              </>))}</tbody>
            </table>
          </div>}
      </div>
    </DashboardLayout>
  );
}
