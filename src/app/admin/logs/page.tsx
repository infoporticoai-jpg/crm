"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { ScrollText, Search } from "lucide-react";

const LABELS = {
  en: {
    title: "Audit Logs",
    search: "Search logs...",
    action: "Action",
    admin: "Admin",
    targetCompany: "Target Company",
    date: "Date",
    detail: "Detail",
    noLogs: "No audit logs",
    allActions: "All Actions",
    create: "Create",
    update: "Update",
    delete: "Delete",
    impersonate: "Impersonate",
    suspend: "Suspend",
    activate: "Activate",
    broadcast: "Broadcast",
  },
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  impersonate: "bg-purple-100 text-purple-700",
  suspend: "bg-red-100 text-red-700",
  activate: "bg-green-100 text-green-700",
  broadcast: "bg-yellow-100 text-yellow-700",
};

interface AuditLog {
  id: string;
  action: string;
  adminName: string;
  targetCompany: string;
  detail: string;
  createdAt: string;
}

export default function LogsPage() {
  const t = LABELS.en;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = async (q = "", action = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (action !== "all") params.set("action", action);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(search, actionFilter), 300);
    return () => clearTimeout(timer);
  }, [search, actionFilter]);

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
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allActions}</SelectItem>
              <SelectItem value="create">{t.create}</SelectItem>
              <SelectItem value="update">{t.update}</SelectItem>
              <SelectItem value="delete">{t.delete}</SelectItem>
              <SelectItem value="impersonate">{t.impersonate}</SelectItem>
              <SelectItem value="suspend">{t.suspend}</SelectItem>
              <SelectItem value="activate">{t.activate}</SelectItem>
              <SelectItem value="broadcast">{t.broadcast}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-12 text-center">
            <ScrollText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">{t.noLogs}</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.action}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">{t.admin}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">{t.targetCompany}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.date}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">{t.detail}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ACTION_COLORS[log.action] || "bg-gray-100"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{log.adminName}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{log.targetCompany}</td>
                    <td className="px-4 py-3">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 truncate max-w-xs">{log.detail}</td>
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
