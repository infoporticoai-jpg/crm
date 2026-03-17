"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Hammer, ChevronRight, FileText, FolderOpen, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const STAGES = ["NOUVEAU","SOUMISSION","BDC","FDP","COMPLETE"];
const STAGE_COLORS: Record<string,string> = { NOUVEAU:"bg-blue-500", SOUMISSION:"bg-yellow-500", BDC:"bg-[#DC7418]", FDP:"bg-purple-500", COMPLETE:"bg-green-500" };

interface FlooringProject { id:string; projectRef:string; projectName:string; contactName:string; location:string; status:string; soumissionUrl?:string; bdcUrl?:string; fdpUrl?:string; driveUrl?:string; lastSyncAt?:string; createdAt:string }

export default function FlooringDetailPage() {
  const { id } = useParams() as { id: string };
  const [project, setProject] = useState<FlooringProject|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { setLoading(true); try { const res = await fetch(`/api/flooring/${id}`); if (res.ok) setProject(await res.json()); } finally { setLoading(false); } })(); }, [id]);

  const advanceStatus = async () => { if (!project) return; const idx = STAGES.indexOf(project.status); if (idx < 0 || idx >= STAGES.length-1) return;
    try { const res = await fetch(`/api/flooring/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: STAGES[idx+1] }) }); if (res.ok) { setProject(await res.json()); toast.success(`Status advanced to ${STAGES[idx+1]}`); } else { toast.error("Failed"); } } catch { toast.error("Failed"); } };

  if (loading) return <DashboardLayout title="Flooring Project"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;
  if (!project) return <DashboardLayout title="Flooring Project"><p>Project not found</p></DashboardLayout>;
  const currentIdx = STAGES.indexOf(project.status);

  return (
    <DashboardLayout title={project.projectName}>
      <div className="space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">{STAGES.map((stage,i) => <div key={stage} className="flex items-center">
            <div className="flex flex-col items-center"><div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${i<=currentIdx ? `${STAGE_COLORS[stage]} text-white` : "bg-gray-200 text-gray-500"}`}>{i+1}</div><span className={`mt-1 text-xs font-medium ${i===currentIdx ? "text-[#DC7418]" : "text-gray-500"}`}>{stage}</span></div>
            {i < STAGES.length-1 && <div className={`mx-2 h-1 w-12 sm:w-20 rounded ${i<currentIdx ? "bg-[#DC7418]" : "bg-gray-200"}`} />}
          </div>)}</div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-4"><Hammer className="h-4 w-4" />Project Info</h3><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-mono">{project.projectRef}</span></div><div className="flex justify-between"><span className="text-gray-500">Project Name</span><span>{project.projectName}</span></div><div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{project.contactName}</span></div><div className="flex justify-between"><span className="text-gray-500">Location</span><span>{project.location}</span></div><div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDate(project.createdAt)}</span></div>{project.lastSyncAt && <div className="flex justify-between"><span className="text-gray-500">Last Sync</span><span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />{formatDate(project.lastSyncAt)}</span></div>}</div></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-4"><FileText className="h-4 w-4" />Documents</h3><div className="space-y-3">
            {[{label:"Soumission PDF",url:project.soumissionUrl},{label:"BDC PDF",url:project.bdcUrl},{label:"FDP Link",url:project.fdpUrl}].map(doc => <div key={doc.label} className="flex items-center justify-between p-3 rounded-lg border"><span className="text-sm">{doc.label}</span>{doc.url ? <a href={doc.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="mr-1 h-4 w-4" />View</Button></a> : <span className="text-xs text-gray-400">Not available</span>}</div>)}
            <div className="flex items-center justify-between p-3 rounded-lg border"><span className="text-sm flex items-center gap-1"><FolderOpen className="h-4 w-4" />Google Drive Folder</span>{project.driveUrl ? <a href={project.driveUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="mr-1 h-4 w-4" />Open</Button></a> : <span className="text-xs text-gray-400">Not linked</span>}</div>
          </div></div>
        </div>
        {currentIdx >= 0 && currentIdx < STAGES.length-1 && <div className="flex justify-end"><Button onClick={advanceStatus}>Advance to {STAGES[currentIdx+1]}<ChevronRight className="ml-1 h-4 w-4" /></Button></div>}
      </div>
    </DashboardLayout>
  );
}
