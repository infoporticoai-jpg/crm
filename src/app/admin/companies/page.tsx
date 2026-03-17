"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Building2, Search, UserCheck, Ban } from "lucide-react";
import { toast } from "sonner";

const LABELS = {
  en: {
    title: "Companies",
    search: "Search companies...",
    name: "Name",
    plan: "Plan",
    status: "Status",
    users: "Users",
    created: "Created",
    actions: "Actions",
    impersonate: "Impersonate",
    suspend: "Suspend",
    activate: "Activate",
    allStatuses: "All Statuses",
    active: "Active",
    pending: "Pending",
    suspended: "Suspended",
    noCompanies: "No companies found",
  },
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
};

interface Company {
  id: string;
  name: string;
  plan: string;
  status: string;
  userCount: number;
  createdAt: string;
}

export default function CompaniesPage() {
  const t = LABELS.en;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCompanies = async (q = "", status = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/companies?${params}`);
      if (res.ok) setCompanies(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchCompanies(search, statusFilter), 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const impersonate = async (companyId: string) => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/impersonate`, { method: "POST" });
      if (res.ok) {
        toast.success("Impersonating company");
        window.location.href = "/dashboard";
      } else {
        toast.error("Failed to impersonate");
      }
    } catch {
      toast.error("Failed to impersonate");
    }
  };

  const toggleStatus = async (companyId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Company ${newStatus}`);
        fetchCompanies(search, statusFilter);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const Spinner = () => (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" />
    </div>
  );

  return (
    <DashboardLayout title={t.title}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="active">{t.active}</SelectItem>
              <SelectItem value="pending">{t.pending}</SelectItem>
              <SelectItem value="suspended">{t.suspended}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Spinner />
        ) : companies.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">{t.noCompanies}</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.name}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">{t.plan}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.status}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">{t.users}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">{t.created}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 capitalize hidden sm:table-cell">{c.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[c.status] || "bg-gray-100"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{c.userCount}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => impersonate(c.id)}>
                          <UserCheck className="h-4 w-4 mr-1" /> {t.impersonate}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(c.id, c.status)}
                          className={c.status === "active" ? "text-red-500" : "text-green-500"}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          {c.status === "active" ? t.suspend : t.activate}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
