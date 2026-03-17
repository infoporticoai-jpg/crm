"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { User, MapPin, Shield, DollarSign, Camera, CalendarDays, Receipt, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_FLOW = ["lead","scheduled","in_progress","completed","invoiced","paid"];
const STATUS_COLORS: Record<string,string> = { lead:"bg-gray-100 text-gray-700", scheduled:"bg-blue-100 text-blue-700", in_progress:"bg-yellow-100 text-yellow-700", completed:"bg-green-100 text-green-700", invoiced:"bg-purple-100 text-purple-700", paid:"bg-emerald-100 text-emerald-700" };

interface Job { id:string; title:string; status:string; customerName:string; customerId:string; address:string; damageType:string; description:string; insurance?:{carrier:string;policyNumber:string;claimNumber:string;claimStatus:string;waterCategory?:string}; costs?:{labor:number;material:number;equipment:number;subcontractor:number}; photos:string[]; appointments:any[]; invoices:any[]; createdAt:string }

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const [job, setJob] = useState<Job|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { setLoading(true); try { const res = await fetch(`/api/jobs/${id}`); if (res.ok) setJob(await res.json()); } finally { setLoading(false); } })(); }, [id]);

  const advanceStatus = async () => { if (!job) return; const idx = STATUS_FLOW.indexOf(job.status); if (idx < 0 || idx >= STATUS_FLOW.length-1) return;
    try { const res = await fetch(`/api/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: STATUS_FLOW[idx+1] }) }); if (res.ok) { setJob(await res.json()); toast.success(`Status updated`); } } catch { toast.error("Failed to update status"); } };

  if (loading) return <DashboardLayout title="Job Detail"><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" /></div></DashboardLayout>;
  if (!job) return <DashboardLayout title="Job Detail"><p>Job not found</p></DashboardLayout>;
  const totalCost = job.costs ? job.costs.labor + job.costs.material + job.costs.equipment + job.costs.subcontractor : 0;

  return (
    <DashboardLayout title={job.title}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[job.status]||"bg-gray-100"}`}>{job.status.replace("_"," ")}</span><span className="text-sm text-gray-500">Created {formatDate(job.createdAt)}</span></div>
          {STATUS_FLOW.indexOf(job.status) >= 0 && STATUS_FLOW.indexOf(job.status) < STATUS_FLOW.length-1 && <Button onClick={advanceStatus}>Advance to {STATUS_FLOW[STATUS_FLOW.indexOf(job.status)+1].replace("_"," ")}<ChevronRight className="ml-1 h-4 w-4" /></Button>}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-3"><User className="h-4 w-4" />Customer</h3><div className="space-y-2 text-sm"><p><Link href={`/customers/${job.customerId}`} className="text-[#DC7418] hover:underline">{job.customerName}</Link></p><p className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4" />{job.address}</p><p className="text-gray-600"><strong>Damage:</strong> {job.damageType}</p>{job.description && <p className="text-gray-600">{job.description}</p>}</div></div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-3"><Shield className="h-4 w-4" />Insurance</h3>{job.insurance ? <div className="space-y-2 text-sm"><p><strong>Carrier:</strong> {job.insurance.carrier}</p><p><strong>Policy #:</strong> {job.insurance.policyNumber}</p><p><strong>Claim #:</strong> {job.insurance.claimNumber}</p><p><strong>Status:</strong> {job.insurance.claimStatus}</p>{job.insurance.waterCategory && <p><strong>Water Category:</strong> {job.insurance.waterCategory}</p>}</div> : <p className="text-sm text-gray-500">No insurance information</p>}</div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-3"><DollarSign className="h-4 w-4" />Cost Breakdown</h3>{job.costs ? <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Labor</span><span>{formatCurrency(job.costs.labor)}</span></div><div className="flex justify-between"><span>Material</span><span>{formatCurrency(job.costs.material)}</span></div><div className="flex justify-between"><span>Equipment</span><span>{formatCurrency(job.costs.equipment)}</span></div><div className="flex justify-between"><span>Subcontractor</span><span>{formatCurrency(job.costs.subcontractor)}</span></div><div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatCurrency(totalCost)}</span></div></div> : <p className="text-sm text-gray-500">No costs recorded</p>}</div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-3"><Camera className="h-4 w-4" />Photos</h3>{job.photos?.length > 0 ? <div className="grid grid-cols-3 gap-2">{job.photos.map((p,i) => <img key={i} src={p} alt={`Photo ${i+1}`} className="h-24 w-full rounded-lg object-cover" />)}</div> : <p className="text-sm text-gray-500">No photos uploaded</p>}</div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-3"><CalendarDays className="h-4 w-4" />Appointments</h3>{job.appointments?.length > 0 ? <div className="divide-y">{job.appointments.map((a:any) => <div key={a.id} className="flex justify-between py-2 text-sm"><span>{a.title}</span><span className="text-gray-500">{formatDate(a.date)}</span></div>)}</div> : <p className="text-sm text-gray-500">No appointments</p>}</div>
          <div className="rounded-xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-semibold mb-3"><Receipt className="h-4 w-4" />Invoices</h3>{job.invoices?.length > 0 ? <div className="divide-y">{job.invoices.map((inv:any) => <div key={inv.id} className="flex justify-between py-2 text-sm"><span>{inv.number}</span><span>{formatCurrency(inv.total)}</span></div>)}</div> : <p className="text-sm text-gray-500">No invoices</p>}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
