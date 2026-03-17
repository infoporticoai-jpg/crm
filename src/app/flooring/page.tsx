"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hammer, Plus, Search } from "lucide-react";

const STATUS_COLORS: Record<string,string> = { NOUVEAU:"bg-blue-100 text-blue-700", SOUMISSION:"bg-yellow-100 text-yellow-700", BDC:"bg-[#DC7418]/10 text-[#DC7418]", FDP:"bg-purple-100 text-purple-700", COMPLETE:"bg-green-100 text-green-700" };
interface FlooringProject { id:string; projectRef:string; projectName:string; contactName:string; location:string; status:string; createdAt:string }

export default function FlooringPage() {
  const [projects, setProjects] = useState<FlooringProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProjects = async (q="") => { setLoading(true); try { const res = await fetch(`/api/flooring?search=${encodeURIComponent(q)}`); if (res.ok) setProjects(await res.json()); } finally { setLoading(false); } };
  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchProjects(search), 300); return () => clearTimeout(t); }, [search]);

  return (
    <DashboardLayout title="Flooring Projects">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Link href="/flooring/new"><Button><Plus className="mr-2 h-4 w-4" />Add Project</Button></Link>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div>
        : projects.length === 0 ? <div className="border-2 border-dashed rounded-xl p-12 text-center"><Hammer className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500 mb-4">No flooring projects yet</p><Link href="/flooring/new"><Button>Add First Project</Button></Link></div>
        : <div className="rounded-xl border bg-white shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left font-medium text-gray-500">Reference</th><th className="px-4 py-3 text-left font-medium text-gray-500">Project Name</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Contact</th><th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Location</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th></tr></thead>
          <tbody className="divide-y">{projects.map(p => <tr key={p.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs">{p.projectRef}</td><td className="px-4 py-3"><Link href={`/flooring/${p.id}`} className="font-medium text-[#DC7418] hover:underline">{p.projectName}</Link></td><td className="px-4 py-3 hidden sm:table-cell">{p.contactName}</td><td className="px-4 py-3 hidden md:table-cell">{p.location}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]||"bg-gray-100 text-gray-700"}`}>{p.status}</span></td></tr>)}</tbody></table></div>}
      </div>
    </DashboardLayout>
  );
}
