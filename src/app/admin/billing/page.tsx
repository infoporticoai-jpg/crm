"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const LABELS = {
  en: {
    title: "Admin Billing",
    search: "Search invoices...",
    createInvoice: "Create Invoice",
    company: "Company",
    amount: "Amount",
    status: "Status",
    dueDate: "Due Date",
    created: "Created",
    noInvoices: "No admin invoices",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    description: "Description",
    selectCompany: "Select company",
  },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

interface AdminInvoice {
  id: string;
  companyName: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

export default function AdminBillingPage() {
  const t = LABELS.en;
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyId: "",
    amount: 0,
    description: "",
    dueDate: "",
  });

  const fetchInvoices = async (q = "") => {
    setLoading(true);
    try {
      const [invRes, compRes] = await Promise.all([
        fetch(`/api/admin/billing?search=${encodeURIComponent(q)}`),
        fetch("/api/admin/companies?limit=100"),
      ]);
      if (invRes.ok) setInvoices(await invRes.json());
      if (compRes.ok) setCompanies(await compRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchInvoices(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Invoice created");
        setDialogOpen(false);
        setForm({ companyId: "", amount: 0, description: "", dueDate: "" });
        fetchInvoices(search);
      } else {
        toast.error("Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t.createInvoice}
          </Button>
        </div>

        {loading ? (
          <Spinner />
        ) : invoices.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">{t.noInvoices}</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.company}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.amount}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t.status}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">{t.dueDate}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">{t.created}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{inv.companyName}</td>
                    <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{formatDate(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.createInvoice}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.company}</Label>
              <Select value={form.companyId} onValueChange={(v) => setForm(f => ({ ...f, companyId: v }))}>
                <SelectTrigger><SelectValue placeholder={t.selectCompany} /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.amount}</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>{t.dueDate}</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t.saving : t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
