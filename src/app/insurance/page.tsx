"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search } from "lucide-react";

const CLAIM_STATUS_COLORS: Record<string,string> = { pending:"bg-yellow-100 text-yellow-700", approved:"bg-green-100 text-green-700", denied:"bg-red-100 text-red-700", in_review:"bg-blue-100 text-blue-700" };
interface InsuranceClaim { id:string; jobId:string; jobTitle:string; carrier:string; policyNumber:string; claimNumber:string; claimStatus:string; waterCategory?:string }

export default function InsurancePage() {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchClaims = async (q="", status="all") => { setLoading(true); try { const p = new URLSearchParams(); if (q) p.set("search",q); if (status!=="all") p.set("claimStatus",status); const res = await fetch(`/api/insurance?${p}`); if (res.ok) setClaims(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchClaims(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchClaims(search, statusFilter), 300); return () => clearTimeout(t); }, [search, statusFilter]);

  return (
    <DashboardLayout title="Insurance Claims">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="denied">Denied</SelectItem><SelectItem value="in_review">In Review</SelectItem></SelectContent></Select>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : claims.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">No insurance claims</p></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Job Title</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Carrier</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Policy #</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Claim #</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Water Cat.</th></tr></thead>
          <tbody className="divide-y">{claims.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-4 py-3"><Link href={`/jobs/${c.jobId}`} className="font-medium text-[#DC7418] hover:underline">{c.jobTitle}</Link></td><td className="px-4 py-3 hidden sm:table-cell">{c.carrier}</td><td className="px-4 py-3 hidden md:table-cell">{c.policyNumber}</td><td className="px-4 py-3 hidden md:table-cell">{c.claimNumber}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CLAIM_STATUS_COLORS[c.claimStatus]||"bg-gray-100"}`}>{c.claimStatus.replace("_"," ")}</span></td><td className="px-4 py-3 hidden lg:table-cell">{c.waterCategory||"-"}</td></tr>)}</tbody></table></div>}
      </div>
    </DashboardLayout>
  );
}
