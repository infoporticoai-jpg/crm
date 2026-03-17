"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Search, Check, X, Pencil, Trash2, Download, ChevronLeft, ChevronRight,
  Package, Users, DollarSign, Warehouse, Truck, ClipboardList, Wrench, Layers,
  CheckSquare, Square,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = "retrait" | "reinstallation" | "nouvelle_installation" | "enlevement" | "clients" | "prix" | "inventaire" | "commandes" | "pickup" | "entretien";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "retrait", label: "Retrait", icon: ClipboardList },
  { key: "reinstallation", label: "Reinstallation", icon: ClipboardList },
  { key: "nouvelle_installation", label: "Nouvelle Installation", icon: Plus },
  { key: "enlevement", label: "Enlevement", icon: Trash2 },
  { key: "clients", label: "Clients", icon: Users },
  { key: "prix", label: "Prix", icon: DollarSign },
  { key: "inventaire", label: "Inventaire", icon: Warehouse },
  { key: "commandes", label: "Commandes Mat Tech", icon: Package },
  { key: "pickup", label: "Pick-up Dominic", icon: Truck },
  { key: "entretien", label: "Entretien", icon: Wrench },
];

interface RetraitRow {
  id: string;
  projet: string;
  nom: string;
  adresse: string;
  ville: string;
  date: string;
  heures: string;
  contact: string;
  pc: number;
  moulures: number;
  nbrGars: number;
  hIns: string;
  fait: boolean;
  confirmation: boolean;
  emailSent: boolean;
  email: string;
  commentaires: string;
  tapeVert?: number;
  entreposage?: boolean;
  nettoyer?: boolean;
  _raw?: any;
}

interface NouvelleInstRow {
  id: string;
  fdpPlan: string;
  courriel: string;
  factureAsp: string;
  date: string;
  heure: string;
  noProjet: string;
  nom: string;
  adresse: string;
  contact: string;
  typeTapis: string;
  noCommande: string;
  rouleau: string;
  commentaires: string;
  hIns: string;
  moulure: number;
  tape: number;
  tapeVert: number;
  pc: number;
  fait: boolean;
  _raw?: any;
}

interface ClientRow {
  id: string;
  projet: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
  contact: string;
  email: string;
  typeBatiment: string;
  nbJobs: number;
  history?: { year: number; type: string; date: string; status: string }[];
}

interface PrixSection {
  title: string;
  items: { id: string; service: string; prix: number; unite: string; bracket: string }[];
}

interface InventaireRow {
  id: string;
  date: string;
  duraDot: number;
  empire: number;
  needlePin6: number;
  needlePin4Brun: number;
  needlePin4Beige: number;
  marathon: number;
  moulureNoir: number;
  tapeEcho: number;
  tapeVert: number;
  tapeProsol: number;
}

interface CommandeRow {
  id: string;
  commande: string;
  qte: number;
  bdcSolatheque: string;
  date: string;
  description: string;
  unite: string;
  ref: string;
  couleur: string;
  emailEnvoye: boolean;
  pickup: boolean;
}

interface PickupRow {
  id: string;
  refMatTech: string;
  commandeSolatheque: string;
  rouleaux: number;
  description: string;
  projet: string;
  dateCommande: string;
  datePickup: string;
  fait: boolean;
  moulure: boolean;
  tape: boolean;
}

interface EntretienRow {
  id: string;
  po: string;
  roulNum: string;
  qtePl: number;
  location: string;
  date: string;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

function rowBg(row: { fait?: boolean; confirmation?: boolean; emailSent?: boolean }): string {
  if (row.fait) return "bg-green-50";
  if (row.confirmation) return "bg-blue-50";
  if (row.emailSent) return "bg-yellow-50";
  return "";
}

// ─── Inline Editable Cell ────────────────────────────────────────────────────

function EditableCell({ value, onSave, type = "text", className = "" }: { value: string | number; onSave: (v: string) => void; type?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  if (!editing) {
    return (
      <span className={`cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded min-w-[2rem] inline-block ${className}`} onClick={() => setEditing(true)}>
        {value || <span className="text-gray-300">--</span>}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Enter") { onSave(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      className="border rounded px-1 py-0.5 text-sm w-full max-w-[120px]"
    />
  );
}

// ─── Checkbox Cell ───────────────────────────────────────────────────────────

function CheckCell({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-center">
      {checked ? <CheckSquare className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-gray-400" />}
    </button>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: { label: string; value: number; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((s) => (
        <div key={s.label} className="flex items-center gap-2 rounded-lg bg-white border px-3 py-2 shadow-sm">
          <span className={`text-lg font-bold ${s.color || "text-[#DC7418]"}`}>{s.value}</span>
          <span className="text-xs text-gray-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function TapisPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("retrait");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [clientDetail, setClientDetail] = useState<ClientRow | null>(null);

  // Data stores per tab
  const [retraitData, setRetraitData] = useState<RetraitRow[]>([]);
  const [reinstallData, setReinstallData] = useState<RetraitRow[]>([]);
  const [nouvelleData, setNouvelleData] = useState<NouvelleInstRow[]>([]);
  const [enlevementData, setEnlevementData] = useState<RetraitRow[]>([]);
  const [clientsData, setClientsData] = useState<ClientRow[]>([]);
  const [prixData, setPrixData] = useState<PrixSection[]>([]);
  const [inventaireData, setInventaireData] = useState<InventaireRow[]>([]);
  const [commandesData, setCommandesData] = useState<CommandeRow[]>([]);
  const [pickupData, setPickupData] = useState<PickupRow[]>([]);
  const [entretienData, setEntretienData] = useState<EntretienRow[]>([]);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<TabKey>>(new Set());

  // Form states
  const [retraitForm, setRetraitForm] = useState<Partial<RetraitRow>>({});
  const [nouvelleForm, setNouvelleForm] = useState<Partial<NouvelleInstRow>>({});
  const [clientForm, setClientForm] = useState<Partial<ClientRow>>({});
  const [commandeForm, setCommandeForm] = useState<Partial<CommandeRow>>({});
  const [pickupForm, setPickupForm] = useState<Partial<PickupRow>>({});
  const [entretienForm, setEntretienForm] = useState<Partial<EntretienRow>>({});
  const [inventaireForm, setInventaireForm] = useState<Partial<InventaireRow>>({});

  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  // Map tab keys to API endpoints
  const tabToEndpoint = (tab: TabKey): string => {
    const JOB_TABS = ["retrait", "reinstallation", "nouvelle_installation", "enlevement"];
    if (JOB_TABS.includes(tab)) return "jobs";
    const MAP: Record<string, string> = { clients: "clients", prix: "pricing", inventaire: "inventory", commandes: "orders", pickup: "pickups", entretien: "maintenance" };
    return MAP[tab] || tab;
  };

  const fetchTabData = useCallback(async (tab: TabKey, force = false) => {
    if (loadedTabs.has(tab) && !force) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const JOB_TABS = ["retrait", "reinstallation", "nouvelle_installation", "enlevement"];
      if (JOB_TABS.includes(tab)) {
        params.set("type", tab);
        params.set("year", yearFilter);
      }
      const endpoint = tabToEndpoint(tab);
      const res = await fetch(`/api/tapis/${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const raw = await res.json();
      // Map API response fields to UI interfaces
      const mapJob = (j: any): RetraitRow => ({
        id: j.id,
        projet: j.client?.projectNumber || "",
        nom: j.client?.name || "",
        adresse: j.client?.address || "",
        ville: j.client?.city || "",
        date: j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString("fr-CA") : "",
        heures: j.hours || "",
        contact: j.client?.contact || "",
        pc: j.pc || 0,
        moulures: j.moulurePL || 0,
        nbrGars: j.crewSize || 0,
        hIns: j.installHours?.toString() || "",
        fait: j.fait,
        confirmation: j.confirmation,
        emailSent: j.emailSent,
        email: j.client?.email || "",
        commentaires: j.comment || "",
        tapeVert: j.tapeVert || 0,
        entreposage: j.entreposage,
        nettoyer: j.nettoyer,
        _raw: j, // keep raw for editing
      });
      const mapNouvelle = (j: any): NouvelleInstRow => ({
        id: j.id,
        fdpPlan: j.fdpPlan ? "TRUE" : "FALSE",
        courriel: j.emailSent ? "TRUE" : "FALSE",
        factureAsp: j.facDevisAsp || "",
        date: j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString("fr-CA") : "",
        heure: j.hours || "",
        noProjet: j.client?.projectNumber || "",
        nom: j.client?.name || "",
        adresse: j.client?.address || "",
        contact: j.client?.contact || "",
        typeTapis: j.carpetType || "",
        noCommande: j.orderNumber || "",
        rouleau: j.rollCount?.toString() || "",
        commentaires: j.comment || "",
        hIns: j.installHours?.toString() || "",
        moulure: j.moulurePL || 0,
        tape: j.tapeCount || 0,
        tapeVert: j.tapeVert || 0,
        pc: j.pc || 0,
        fait: j.fait,
        _raw: j,
      });
      const mapClient = (c: any): ClientRow => ({
        id: c.id,
        projet: c.projectNumber,
        nom: c.name,
        adresse: c.address || "",
        ville: c.city || "",
        codePostal: c.postalCode || "",
        contact: c.contact || "",
        email: c.email || "",
        typeBatiment: c.buildingType || "",
        nbJobs: c._count?.jobs || 0,
      });
      switch (tab) {
        case "retrait": setRetraitData(raw.map(mapJob)); break;
        case "reinstallation": setReinstallData(raw.map(mapJob)); break;
        case "nouvelle_installation": setNouvelleData(raw.map(mapNouvelle)); break;
        case "enlevement": setEnlevementData(raw.map(mapJob)); break;
        case "clients": setClientsData(raw.map(mapClient)); break;
        case "prix": {
          // Group flat pricing records into sections by serviceCategory
          const SECTION_LABELS: Record<string, string> = { service: "Service (usagé)", neuf: "Neuf", camion_usine: "Camion usine", camion_usine_entree: "Camion usine tapis d'entrée" };
          const groups: Record<string, any[]> = {};
          for (const r of raw) {
            const cat = r.serviceCategory || "service";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ id: r.id, service: r.serviceName, prix: r.pricePerUnit, unite: r.unit, bracket: r.bracket || "" });
          }
          setPrixData(Object.entries(groups).map(([cat, items]) => ({ title: SECTION_LABELS[cat] || cat, items })));
          break;
        }
        case "inventaire": setInventaireData(raw.map((r: any) => ({
          ...r, date: r.date ? new Date(r.date).toLocaleDateString("fr-CA") : "",
        }))); break;
        case "commandes": setCommandesData(raw.map((r: any) => ({
          id: r.id, commande: r.matTechRef || "", qte: r.quantity || 0, bdcSolatheque: r.orderRef || "",
          date: r.date ? new Date(r.date).toLocaleDateString("fr-CA") : "", description: r.description || "",
          unite: r.unit || "", ref: r.matTechRef || "", couleur: r.color || "",
          emailEnvoye: r.emailSent, pickup: r.pickupDone,
        }))); break;
        case "pickup": setPickupData(raw.map((r: any) => ({
          id: r.id, refMatTech: r.matTechRef || "", commandeSolatheque: r.orderRef || "",
          rouleaux: r.rollCount || 0, description: r.description || "", projet: r.project || "",
          dateCommande: r.orderDate ? new Date(r.orderDate).toLocaleDateString("fr-CA") : "",
          datePickup: r.pickupDate ? new Date(r.pickupDate).toLocaleDateString("fr-CA") : "",
          fait: r.done, moulure: r.moulure || 0, tape: r.tape || 0,
        }))); break;
        case "entretien": setEntretienData(raw.map((r: any) => ({
          id: r.id, po: r.poNumber || "", roulNum: r.rollNumber?.toString() || "",
          qtePl: r.quantityPL || 0, location: r.location || "",
          date: r.date ? new Date(r.date).toLocaleDateString("fr-CA") : "", notes: r.notes || "",
        }))); break;
      }
      setLoadedTabs((prev) => new Set(prev).add(tab));
    } catch {
      // Silently handle — data will show empty state
    } finally {
      setLoading(false);
    }
  }, [search, yearFilter, loadedTabs]);

  // Fetch on tab change
  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  // Refetch on search/year change for active tab
  useEffect(() => {
    const t = setTimeout(() => fetchTabData(activeTab, true), 300);
    return () => clearTimeout(t);
  }, [search, yearFilter]);

  // ─── Inline field save ───────────────────────────────────────────────────

  // Map UI field names to API field names
  const mapFieldToApi = (tab: TabKey, field: string): string => {
    const JOB_TABS = ["retrait", "reinstallation", "nouvelle_installation", "enlevement"];
    if (JOB_TABS.includes(tab)) {
      const MAP: Record<string, string> = {
        heures: "hours", nbrGars: "crewSize", hIns: "installHours", heure: "hours",
        commentaires: "comment", typeTapis: "carpetType", noCommande: "orderNumber",
        rouleau: "rollCount", moulure: "moulurePL", factureAsp: "facDevisAsp",
        courriel: "emailSent", date: "scheduledDate",
      };
      return MAP[field] || field;
    }
    if (tab === "clients") {
      const MAP: Record<string, string> = { projet: "projectNumber", nom: "name", adresse: "address", ville: "city", codePostal: "postalCode", typeBatiment: "buildingType" };
      return MAP[field] || field;
    }
    if (tab === "commandes") {
      const MAP: Record<string, string> = { commande: "matTechRef", qte: "quantity", bdcSolatheque: "orderRef", ref: "matTechRef", couleur: "color", unite: "unit", emailEnvoye: "emailSent", pickup: "pickupDone" };
      return MAP[field] || field;
    }
    if (tab === "pickup") {
      const MAP: Record<string, string> = { refMatTech: "matTechRef", commandeSolatheque: "orderRef", rouleaux: "rollCount", projet: "project", dateCommande: "orderDate", datePickup: "pickupDate", fait: "done" };
      return MAP[field] || field;
    }
    if (tab === "entretien") {
      const MAP: Record<string, string> = { po: "poNumber", roulNum: "rollNumber", qtePl: "quantityPL" };
      return MAP[field] || field;
    }
    if (tab === "prix") {
      const MAP: Record<string, string> = { service: "serviceName", prix: "pricePerUnit", unite: "unit" };
      return MAP[field] || field;
    }
    return field;
  };

  const saveField = async (tab: TabKey, id: string, field: string, value: string | number | boolean) => {
    try {
      const endpoint = tabToEndpoint(tab);
      const apiField = mapFieldToApi(tab, field);
      const res = await fetch(`/api/tapis/${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiField]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved");
      fetchTabData(activeTab, true);
    } catch {
      toast.error("Save failed");
    }
  };

  // ─── Bulk mark done ──────────────────────────────────────────────────────

  const bulkMarkDone = async () => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedRows).map((id) =>
          fetch(`/api/tapis/${tabToEndpoint(activeTab)}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fait: true }),
          })
        )
      );
      toast.success(`${selectedRows.size} marked as done`);
      setSelectedRows(new Set());
      fetchTabData(activeTab, true);
    } catch {
      toast.error("Bulk update failed");
    }
  };

  // ─── Create / Edit entry ─────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setRetraitForm({});
    setNouvelleForm({});
    setClientForm({});
    setCommandeForm({});
    setPickupForm({});
    setEntretienForm({});
    setInventaireForm({});
    setDialogOpen(true);
  };

  const openEdit = (id: string, data: any) => {
    setEditingId(id);
    switch (activeTab) {
      case "retrait": case "reinstallation": case "enlevement":
        setRetraitForm(data); break;
      case "nouvelle_installation":
        setNouvelleForm(data); break;
      case "clients":
        setClientForm(data); break;
      case "commandes":
        setCommandeForm(data); break;
      case "pickup":
        setPickupForm(data); break;
      case "entretien":
        setEntretienForm(data); break;
      case "inventaire":
        setInventaireForm(data); break;
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let body: any = {};
      const JOB_TABS = ["retrait", "reinstallation", "nouvelle_installation", "enlevement"];
      switch (activeTab) {
        case "retrait": case "reinstallation": case "enlevement":
          body = {
            clientId: retraitForm._raw?.clientId || retraitForm.clientId,
            jobType: activeTab, year: parseInt(yearFilter),
            scheduledDate: retraitForm.date || null, hours: retraitForm.heures,
            crewSize: retraitForm.nbrGars, installHours: retraitForm.hIns ? parseFloat(retraitForm.hIns) : null,
            pc: retraitForm.pc, moulurePL: retraitForm.moulures, comment: retraitForm.commentaires,
            fait: retraitForm.fait, confirmation: retraitForm.confirmation, emailSent: retraitForm.emailSent,
            entreposage: retraitForm.entreposage, nettoyer: retraitForm.nettoyer,
          }; break;
        case "nouvelle_installation":
          body = {
            clientId: nouvelleForm._raw?.clientId || nouvelleForm.clientId,
            jobType: "nouvelle_installation", year: parseInt(yearFilter),
            scheduledDate: nouvelleForm.date || null, hours: nouvelleForm.heure,
            carpetType: nouvelleForm.typeTapis, orderNumber: nouvelleForm.noCommande,
            rollCount: nouvelleForm.rouleau ? parseInt(nouvelleForm.rouleau) : null,
            installHours: nouvelleForm.hIns ? parseFloat(nouvelleForm.hIns) : null,
            moulurePL: nouvelleForm.moulure, tapeCount: nouvelleForm.tape,
            tapeVert: nouvelleForm.tapeVert, pc: nouvelleForm.pc,
            facDevisAsp: nouvelleForm.factureAsp, fdpPlan: nouvelleForm.fdpPlan === "TRUE",
            emailSent: nouvelleForm.courriel === "TRUE", fait: nouvelleForm.fait,
            comment: nouvelleForm.commentaires,
          }; break;
        case "clients":
          body = { projectNumber: clientForm.projet, name: clientForm.nom, address: clientForm.adresse, city: clientForm.ville, postalCode: clientForm.codePostal, contact: clientForm.contact, email: clientForm.email, buildingType: clientForm.typeBatiment }; break;
        case "commandes":
          body = { matTechRef: commandeForm.commande, quantity: commandeForm.qte, orderRef: commandeForm.bdcSolatheque, date: commandeForm.date, description: commandeForm.description, unit: commandeForm.unite, color: commandeForm.couleur, emailSent: commandeForm.emailEnvoye, pickupDone: commandeForm.pickup, pickupLocation: commandeForm.pickupLocation }; break;
        case "pickup":
          body = { matTechRef: pickupForm.refMatTech, orderRef: pickupForm.commandeSolatheque, rollCount: pickupForm.rouleaux, description: pickupForm.description, project: pickupForm.projet, orderDate: pickupForm.dateCommande, pickupDate: pickupForm.datePickup, done: pickupForm.fait, moulure: pickupForm.moulure, tape: pickupForm.tape }; break;
        case "entretien":
          body = { poNumber: entretienForm.po, rollNumber: entretienForm.roulNum ? parseInt(entretienForm.roulNum) : null, quantityPL: entretienForm.qtePl, location: entretienForm.location, date: entretienForm.date, notes: entretienForm.notes }; break;
        case "inventaire":
          body = inventaireForm; break;
        case "prix":
          body = {}; break;
      }

      const endpoint = tabToEndpoint(activeTab);
      const url = editingId ? `/api/tapis/${endpoint}/${editingId}` : `/api/tapis/${endpoint}`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editingId ? "Updated" : "Created");
      setDialogOpen(false);
      fetchTabData(activeTab, true);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      const res = await fetch(`/api/tapis/${tabToEndpoint(activeTab)}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      fetchTabData(activeTab, true);
    } catch {
      toast.error("Delete failed");
    }
  };

  // ─── Row selection toggle ────────────────────────────────────────────────

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[]) => {
    setSelectedRows((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  };

  // ─── Stats for current tab ──────────────────────────────────────────────

  const getStats = (): { label: string; value: number; color?: string }[] => {
    switch (activeTab) {
      case "retrait": return [
        { label: "Total", value: retraitData.length },
        { label: "Fait", value: retraitData.filter((r) => r.fait).length, color: "text-green-600" },
        { label: "Confirme", value: retraitData.filter((r) => r.confirmation).length, color: "text-blue-600" },
      ];
      case "reinstallation": return [
        { label: "Total", value: reinstallData.length },
        { label: "Fait", value: reinstallData.filter((r) => r.fait).length, color: "text-green-600" },
        { label: "Confirme", value: reinstallData.filter((r) => r.confirmation).length, color: "text-blue-600" },
      ];
      case "nouvelle_installation": return [
        { label: "Total", value: nouvelleData.length },
        { label: "Fait", value: nouvelleData.filter((r) => r.fait).length, color: "text-green-600" },
      ];
      case "enlevement": return [
        { label: "Total", value: enlevementData.length },
        { label: "Fait", value: enlevementData.filter((r) => r.fait).length, color: "text-green-600" },
      ];
      case "clients": return [
        { label: "Total clients", value: clientsData.length },
      ];
      case "inventaire": return [
        { label: "Entries", value: inventaireData.length },
      ];
      case "commandes": return [
        { label: "Total", value: commandesData.length },
        { label: "Email envoye", value: commandesData.filter((r) => r.emailEnvoye).length, color: "text-blue-600" },
        { label: "Picked up", value: commandesData.filter((r) => r.pickup).length, color: "text-green-600" },
      ];
      case "pickup": return [
        { label: "Total", value: pickupData.length },
        { label: "Fait", value: pickupData.filter((r) => r.fait).length, color: "text-green-600" },
      ];
      case "entretien": return [
        { label: "Total", value: entretienData.length },
      ];
      default: return [];
    }
  };

  // ─── Job tabs (retrait, reinstallation, enlevement) share same columns ─

  const isJobTab = ["retrait", "reinstallation", "enlevement"].includes(activeTab);
  const isReinstall = activeTab === "reinstallation";

  const getJobData = (): RetraitRow[] => {
    switch (activeTab) {
      case "retrait": return retraitData;
      case "reinstallation": return reinstallData;
      case "enlevement": return enlevementData;
      default: return [];
    }
  };

  // ─── Tab scroll helpers ──────────────────────────────────────────────────

  const scrollTabs = (dir: "left" | "right") => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Tapis">
      <div className="space-y-4">
        {/* Tab Bar */}
        <div className="flex items-center gap-1">
          <button onClick={() => scrollTabs("left")} className="lg:hidden p-1 text-gray-400 hover:text-gray-600"><ChevronLeft className="h-4 w-4" /></button>
          <div ref={tabScrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearch(""); setSelectedRows(new Set()); }}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                    activeTab === tab.key ? "bg-[#DC7418] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => scrollTabs("right")} className="lg:hidden p-1 text-gray-400 hover:text-gray-600"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Stats Bar */}
        {activeTab !== "prix" && <StatsBar items={getStats()} />}

        {/* Controls: Search + Year Filter + Add + Bulk */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1">
            {(isJobTab || activeTab === "nouvelle_installation" || activeTab === "clients" || activeTab === "commandes") && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            )}
            {(isJobTab || activeTab === "nouvelle_installation" || activeTab === "enlevement") && (
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <Button variant="outline" onClick={bulkMarkDone}>
                <Check className="mr-2 h-4 w-4" />
                Mark {selectedRows.size} done
              </Button>
            )}
            {activeTab !== "prix" && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ═══ JOB TABS: Retrait / Reinstallation / Enlevement ═══ */}
            {isJobTab && (
              getJobData().length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucune entree pour {TABS.find((t) => t.key === activeTab)?.label}</p>
                  <Button onClick={openCreate}>Ajouter</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-left"><CheckCell checked={getJobData().every((r) => selectedRows.has(r.id))} onToggle={() => toggleAll(getJobData().map((r) => r.id))} /></th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">#Projet</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Nom</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Adresse</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Ville</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Date</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">Heures</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Contact</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">PC</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Moul.</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden sm:table-cell">Gars</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden sm:table-cell">H/ins</th>
                        {isReinstall && <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden lg:table-cell">T.Vert</th>}
                        {isReinstall && <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden lg:table-cell">Entrep.</th>}
                        {isReinstall && <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden lg:table-cell">Nett.</th>}
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Fait</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Conf.</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden md:table-cell">Email</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden xl:table-cell">Commentaires</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {getJobData().map((row) => (
                        <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${rowBg(row)}`}>
                          <td className="px-2 py-2"><CheckCell checked={selectedRows.has(row.id)} onToggle={() => toggleRow(row.id)} /></td>
                          <td className="px-3 py-2 font-mono text-xs">{row.projet}</td>
                          <td className="px-3 py-2 font-medium"><EditableCell value={row.nom} onSave={(v) => saveField(activeTab, row.id, "nom", v)} /></td>
                          <td className="px-3 py-2 hidden md:table-cell"><EditableCell value={row.adresse} onSave={(v) => saveField(activeTab, row.id, "adresse", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.ville} onSave={(v) => saveField(activeTab, row.id, "ville", v)} /></td>
                          <td className="px-3 py-2"><EditableCell value={row.date} onSave={(v) => saveField(activeTab, row.id, "date", v)} type="date" /></td>
                          <td className="px-3 py-2 hidden sm:table-cell"><EditableCell value={row.heures} onSave={(v) => saveField(activeTab, row.id, "heures", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.contact} onSave={(v) => saveField(activeTab, row.id, "contact", v)} /></td>
                          <td className="px-2 py-2 text-center text-xs">{row.pc ? row.pc.toLocaleString() : ""}</td>
                          <td className="px-2 py-2 text-center text-xs">{row.moulures || ""}</td>
                          <td className="px-2 py-2 text-center hidden sm:table-cell"><EditableCell value={row.nbrGars} onSave={(v) => saveField(activeTab, row.id, "nbrGars", Number(v))} type="number" /></td>
                          <td className="px-2 py-2 text-center hidden sm:table-cell"><EditableCell value={row.hIns} onSave={(v) => saveField(activeTab, row.id, "hIns", v)} /></td>
                          {isReinstall && <td className="px-2 py-2 text-center hidden lg:table-cell"><CheckCell checked={!!row.tapeVert} onToggle={() => saveField(activeTab, row.id, "tapeVert", !row.tapeVert)} /></td>}
                          {isReinstall && <td className="px-2 py-2 text-center hidden lg:table-cell"><CheckCell checked={!!row.entreposage} onToggle={() => saveField(activeTab, row.id, "entreposage", !row.entreposage)} /></td>}
                          {isReinstall && <td className="px-2 py-2 text-center hidden lg:table-cell"><CheckCell checked={!!row.nettoyer} onToggle={() => saveField(activeTab, row.id, "nettoyer", !row.nettoyer)} /></td>}
                          <td className="px-2 py-2 text-center"><CheckCell checked={row.fait} onToggle={() => saveField(activeTab, row.id, "fait", !row.fait)} /></td>
                          <td className="px-2 py-2 text-center"><CheckCell checked={row.confirmation} onToggle={() => saveField(activeTab, row.id, "confirmation", !row.confirmation)} /></td>
                          <td className="px-2 py-2 text-center hidden md:table-cell"><CheckCell checked={row.emailSent} onToggle={() => saveField(activeTab, row.id, "emailSent", !row.emailSent)} /></td>
                          <td className="px-3 py-2 hidden xl:table-cell max-w-[200px] truncate text-gray-500 text-xs">{row.commentaires}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(row.id, row)} className="p-1 hover:bg-gray-200 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ═══ NOUVELLE INSTALLATION ═══ */}
            {activeTab === "nouvelle_installation" && (
              nouvelleData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucune nouvelle installation</p>
                  <Button onClick={openCreate}>Ajouter</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-2 py-3"><CheckCell checked={nouvelleData.every((r) => selectedRows.has(r.id))} onToggle={() => toggleAll(nouvelleData.map((r) => r.id))} /></th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">FDP Plan</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Courriel</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Facture ASP</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Date</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">Heure</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">NO Projet</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Nom</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Adresse</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Contact</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Type tapis</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">No Cmd</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden xl:table-cell">Rouleau</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Moul.</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden sm:table-cell">Tape</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden sm:table-cell">T.V.</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">PC</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Fait</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {nouvelleData.map((row) => (
                        <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.fait ? "bg-green-50" : ""}`}>
                          <td className="px-2 py-2"><CheckCell checked={selectedRows.has(row.id)} onToggle={() => toggleRow(row.id)} /></td>
                          <td className="px-3 py-2"><EditableCell value={row.fdpPlan} onSave={(v) => saveField(activeTab, row.id, "fdpPlan", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.courriel} onSave={(v) => saveField(activeTab, row.id, "courriel", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.factureAsp} onSave={(v) => saveField(activeTab, row.id, "factureAsp", v)} /></td>
                          <td className="px-3 py-2"><EditableCell value={row.date} onSave={(v) => saveField(activeTab, row.id, "date", v)} type="date" /></td>
                          <td className="px-3 py-2 hidden sm:table-cell"><EditableCell value={row.heure} onSave={(v) => saveField(activeTab, row.id, "heure", v)} /></td>
                          <td className="px-3 py-2 font-mono text-xs">{row.noProjet}</td>
                          <td className="px-3 py-2 font-medium"><EditableCell value={row.nom} onSave={(v) => saveField(activeTab, row.id, "nom", v)} /></td>
                          <td className="px-3 py-2 hidden md:table-cell"><EditableCell value={row.adresse} onSave={(v) => saveField(activeTab, row.id, "adresse", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.contact} onSave={(v) => saveField(activeTab, row.id, "contact", v)} /></td>
                          <td className="px-3 py-2 hidden md:table-cell"><EditableCell value={row.typeTapis} onSave={(v) => saveField(activeTab, row.id, "typeTapis", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.noCommande} onSave={(v) => saveField(activeTab, row.id, "noCommande", v)} /></td>
                          <td className="px-3 py-2 hidden xl:table-cell"><EditableCell value={row.rouleau} onSave={(v) => saveField(activeTab, row.id, "rouleau", v)} /></td>
                          <td className="px-2 py-2 text-center text-xs">{row.moulure || ""}</td>
                          <td className="px-2 py-2 text-center hidden sm:table-cell text-xs">{row.tape || ""}</td>
                          <td className="px-2 py-2 text-center hidden sm:table-cell text-xs">{row.tapeVert || ""}</td>
                          <td className="px-2 py-2 text-center text-xs">{row.pc ? row.pc.toLocaleString() : ""}</td>
                          <td className="px-2 py-2 text-center"><CheckCell checked={row.fait} onToggle={() => saveField(activeTab, row.id, "fait", !row.fait)} /></td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(row.id, row)} className="p-1 hover:bg-gray-200 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ═══ CLIENTS ═══ */}
            {activeTab === "clients" && (
              clientDetail ? (
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setClientDetail(null)}><ChevronLeft className="mr-2 h-4 w-4" />Retour a la liste</Button>
                  <div className="rounded-xl border bg-white shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-lg font-bold mb-4">{clientDetail.nom}</h2>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Projet:</span> {clientDetail.projet}</p>
                          <p><span className="text-gray-500">Adresse:</span> {clientDetail.adresse}</p>
                          <p><span className="text-gray-500">Ville:</span> {clientDetail.ville}</p>
                          <p><span className="text-gray-500">Code postal:</span> {clientDetail.codePostal}</p>
                          <p><span className="text-gray-500">Contact:</span> {clientDetail.contact}</p>
                          <p><span className="text-gray-500">Email:</span> {clientDetail.email}</p>
                          <p><span className="text-gray-500">Type batiment:</span> {clientDetail.typeBatiment}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-3">Historique des saisons</h3>
                        {clientDetail.history && clientDetail.history.length > 0 ? (
                          <div className="space-y-2">
                            {clientDetail.history.map((h, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                <div>
                                  <span className="font-medium text-sm">{h.year}</span>
                                  <span className="ml-2 text-xs text-gray-500">{h.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{h.date}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${h.status === "fait" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{h.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Aucun historique disponible</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : clientsData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucun client</p>
                  <Button onClick={openCreate}>Ajouter un client</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">#Projet</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Nom</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Adresse</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Ville</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Code Postal</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">Contact</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Email</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Type bat.</th>
                        <th className="px-3 py-3 text-center font-medium text-gray-500 text-xs">Jobs</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {clientsData.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setClientDetail(row)}>
                          <td className="px-3 py-2 font-mono text-xs">{row.projet}</td>
                          <td className="px-3 py-2 font-medium text-[#DC7418]">{row.nom}</td>
                          <td className="px-3 py-2 hidden md:table-cell">{row.adresse}</td>
                          <td className="px-3 py-2 hidden lg:table-cell">{row.ville}</td>
                          <td className="px-3 py-2 hidden lg:table-cell">{row.codePostal}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">{row.contact}</td>
                          <td className="px-3 py-2 hidden md:table-cell">{row.email}</td>
                          <td className="px-3 py-2 hidden lg:table-cell">{row.typeBatiment}</td>
                          <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#DC7418]/10 text-[#DC7418] text-xs font-medium">{row.nbJobs}</span></td>
                          <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(row.id, row)} className="p-1 hover:bg-gray-200 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ═══ PRIX ═══ */}
            {activeTab === "prix" && (
              prixData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Aucune grille de prix configuree</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {prixData.map((section) => (
                    <div key={section.title} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <h3 className="font-semibold text-sm">{section.title}</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Service</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-500 text-xs">Prix</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Unite</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Bracket</th>
                            <th className="px-2 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {section.items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2"><EditableCell value={item.service} onSave={(v) => saveField("prix", item.id, "service", v)} /></td>
                              <td className="px-4 py-2 text-right font-mono"><EditableCell value={item.prix} onSave={(v) => saveField("prix", item.id, "prix", Number(v))} type="number" /></td>
                              <td className="px-4 py-2"><EditableCell value={item.unite} onSave={(v) => saveField("prix", item.id, "unite", v)} /></td>
                              <td className="px-4 py-2"><EditableCell value={item.bracket} onSave={(v) => saveField("prix", item.id, "bracket", v)} /></td>
                              <td className="px-2 py-2">
                                <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ═══ INVENTAIRE ═══ */}
            {activeTab === "inventaire" && (
              inventaireData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Warehouse className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucun inventaire</p>
                  <Button onClick={openCreate}>Ajouter</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Date</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Dura Dot</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Empire</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden sm:table-cell">NP 6&apos;</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden sm:table-cell">NP 4&apos; Brun</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden md:table-cell">NP 4&apos; Beige</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden md:table-cell">Marathon</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden lg:table-cell">Moul. Noir</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden lg:table-cell">Tape Echo</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden lg:table-cell">Tape Vert</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs hidden xl:table-cell">Tape Prosol</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventaireData.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2 text-right font-mono"><EditableCell value={row.duraDot} onSave={(v) => saveField("inventaire", row.id, "duraDot", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono"><EditableCell value={row.empire} onSave={(v) => saveField("inventaire", row.id, "empire", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden sm:table-cell"><EditableCell value={row.needlePin6} onSave={(v) => saveField("inventaire", row.id, "needlePin6", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden sm:table-cell"><EditableCell value={row.needlePin4Brun} onSave={(v) => saveField("inventaire", row.id, "needlePin4Brun", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden md:table-cell"><EditableCell value={row.needlePin4Beige} onSave={(v) => saveField("inventaire", row.id, "needlePin4Beige", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden md:table-cell"><EditableCell value={row.marathon} onSave={(v) => saveField("inventaire", row.id, "marathon", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden lg:table-cell"><EditableCell value={row.moulureNoir} onSave={(v) => saveField("inventaire", row.id, "moulureNoir", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden lg:table-cell"><EditableCell value={row.tapeEcho} onSave={(v) => saveField("inventaire", row.id, "tapeEcho", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden lg:table-cell"><EditableCell value={row.tapeVert} onSave={(v) => saveField("inventaire", row.id, "tapeVert", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 text-right font-mono hidden xl:table-cell"><EditableCell value={row.tapeProsol} onSave={(v) => saveField("inventaire", row.id, "tapeProsol", Number(v))} type="number" /></td>
                          <td className="px-2 py-2">
                            <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ═══ COMMANDES MAT TECH ═══ */}
            {activeTab === "commandes" && (
              commandesData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucune commande</p>
                  <Button onClick={openCreate}>Ajouter</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-2 py-3"><CheckCell checked={commandesData.every((r) => selectedRows.has(r.id))} onToggle={() => toggleAll(commandesData.map((r) => r.id))} /></th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Commande</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Qte</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">#BDC Solath.</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Date</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Description</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Unite</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Ref</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Couleur</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Email</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Pick-up</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commandesData.map((row) => (
                        <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.pickup ? "bg-green-50" : row.emailEnvoye ? "bg-yellow-50" : ""}`}>
                          <td className="px-2 py-2"><CheckCell checked={selectedRows.has(row.id)} onToggle={() => toggleRow(row.id)} /></td>
                          <td className="px-3 py-2 font-mono text-xs"><EditableCell value={row.commande} onSave={(v) => saveField("commandes", row.id, "commande", v)} /></td>
                          <td className="px-3 py-2 text-right font-mono"><EditableCell value={row.qte} onSave={(v) => saveField("commandes", row.id, "qte", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 hidden sm:table-cell"><EditableCell value={row.bdcSolatheque} onSave={(v) => saveField("commandes", row.id, "bdcSolatheque", v)} /></td>
                          <td className="px-3 py-2"><EditableCell value={row.date} onSave={(v) => saveField("commandes", row.id, "date", v)} type="date" /></td>
                          <td className="px-3 py-2 hidden md:table-cell max-w-[200px] truncate"><EditableCell value={row.description} onSave={(v) => saveField("commandes", row.id, "description", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.unite} onSave={(v) => saveField("commandes", row.id, "unite", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.ref} onSave={(v) => saveField("commandes", row.id, "ref", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.couleur} onSave={(v) => saveField("commandes", row.id, "couleur", v)} /></td>
                          <td className="px-2 py-2 text-center"><CheckCell checked={row.emailEnvoye} onToggle={() => saveField("commandes", row.id, "emailEnvoye", !row.emailEnvoye)} /></td>
                          <td className="px-2 py-2 text-center"><CheckCell checked={row.pickup} onToggle={() => saveField("commandes", row.id, "pickup", !row.pickup)} /></td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(row.id, row)} className="p-1 hover:bg-gray-200 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ═══ PICK-UP DOMINIC ═══ */}
            {activeTab === "pickup" && (
              pickupData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucun pick-up</p>
                  <Button onClick={openCreate}>Ajouter</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-2 py-3"><CheckCell checked={pickupData.every((r) => selectedRows.has(r.id))} onToggle={() => toggleAll(pickupData.map((r) => r.id))} /></th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Ref Mat Tech</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">#Cmd Solath.</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Rouleaux</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Description</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden md:table-cell">Projet</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs hidden lg:table-cell">Date cmd</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Date pickup</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs">Fait</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden sm:table-cell">Moul.</th>
                        <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs hidden sm:table-cell">Tape</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pickupData.map((row) => (
                        <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.fait ? "bg-green-50" : ""}`}>
                          <td className="px-2 py-2"><CheckCell checked={selectedRows.has(row.id)} onToggle={() => toggleRow(row.id)} /></td>
                          <td className="px-3 py-2 font-mono text-xs"><EditableCell value={row.refMatTech} onSave={(v) => saveField("pickup", row.id, "refMatTech", v)} /></td>
                          <td className="px-3 py-2 hidden sm:table-cell"><EditableCell value={row.commandeSolatheque} onSave={(v) => saveField("pickup", row.id, "commandeSolatheque", v)} /></td>
                          <td className="px-3 py-2 text-right font-mono"><EditableCell value={row.rouleaux} onSave={(v) => saveField("pickup", row.id, "rouleaux", Number(v))} type="number" /></td>
                          <td className="px-3 py-2 hidden md:table-cell"><EditableCell value={row.description} onSave={(v) => saveField("pickup", row.id, "description", v)} /></td>
                          <td className="px-3 py-2 hidden md:table-cell"><EditableCell value={row.projet} onSave={(v) => saveField("pickup", row.id, "projet", v)} /></td>
                          <td className="px-3 py-2 hidden lg:table-cell"><EditableCell value={row.dateCommande} onSave={(v) => saveField("pickup", row.id, "dateCommande", v)} type="date" /></td>
                          <td className="px-3 py-2"><EditableCell value={row.datePickup} onSave={(v) => saveField("pickup", row.id, "datePickup", v)} type="date" /></td>
                          <td className="px-2 py-2 text-center"><CheckCell checked={row.fait} onToggle={() => saveField("pickup", row.id, "fait", !row.fait)} /></td>
                          <td className="px-2 py-2 text-center hidden sm:table-cell"><CheckCell checked={row.moulure} onToggle={() => saveField("pickup", row.id, "moulure", !row.moulure)} /></td>
                          <td className="px-2 py-2 text-center hidden sm:table-cell"><CheckCell checked={row.tape} onToggle={() => saveField("pickup", row.id, "tape", !row.tape)} /></td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(row.id, row)} className="p-1 hover:bg-gray-200 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ═══ ENTRETIEN ═══ */}
            {activeTab === "entretien" && (
              entretienData.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Aucun entretien</p>
                  <Button onClick={openCreate}>Ajouter</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">P.O.</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Roul #</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Qte PL</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Location</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Date</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Notes</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {entretienData.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs"><EditableCell value={row.po} onSave={(v) => saveField("entretien", row.id, "po", v)} /></td>
                          <td className="px-3 py-2"><EditableCell value={row.roulNum} onSave={(v) => saveField("entretien", row.id, "roulNum", v)} /></td>
                          <td className="px-3 py-2 text-right font-mono"><EditableCell value={row.qtePl} onSave={(v) => saveField("entretien", row.id, "qtePl", Number(v))} type="number" /></td>
                          <td className="px-3 py-2"><EditableCell value={row.location} onSave={(v) => saveField("entretien", row.id, "location", v)} /></td>
                          <td className="px-3 py-2"><EditableCell value={row.date} onSave={(v) => saveField("entretien", row.id, "date", v)} type="date" /></td>
                          <td className="px-3 py-2 max-w-[300px]"><EditableCell value={row.notes} onSave={(v) => saveField("entretien", row.id, "notes", v)} /></td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(row.id, row)} className="p-1 hover:bg-gray-200 rounded"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ═══ DIALOGS ═══ */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier" : "Ajouter"} — {TABS.find((t) => t.key === activeTab)?.label}
            </DialogTitle>
          </DialogHeader>

          {/* ─── Job Form (retrait / reinstallation / enlevement) ─── */}
          {isJobTab && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>#Projet</Label><Input value={retraitForm.projet || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, projet: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Nom</Label><Input value={retraitForm.nom || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, nom: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Adresse</Label><Input value={retraitForm.adresse || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, adresse: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Ville</Label><Input value={retraitForm.ville || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, ville: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={retraitForm.date || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Heures</Label><Input value={retraitForm.heures || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, heures: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Nbr gars</Label><Input type="number" value={retraitForm.nbrGars || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, nbrGars: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contact</Label><Input value={retraitForm.contact || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, contact: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={retraitForm.email || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>H/ins</Label><Input value={retraitForm.hIns || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, hIns: e.target.value }))} /></div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.pc || false} onChange={(e) => setRetraitForm((f) => ({ ...f, pc: e.target.checked }))} className="rounded" />PC</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.moulures || false} onChange={(e) => setRetraitForm((f) => ({ ...f, moulures: e.target.checked }))} className="rounded" />Moulures</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.fait || false} onChange={(e) => setRetraitForm((f) => ({ ...f, fait: e.target.checked }))} className="rounded" />Fait</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.confirmation || false} onChange={(e) => setRetraitForm((f) => ({ ...f, confirmation: e.target.checked }))} className="rounded" />Confirmation</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.emailSent || false} onChange={(e) => setRetraitForm((f) => ({ ...f, emailSent: e.target.checked }))} className="rounded" />Email envoye</label>
                {isReinstall && (
                  <>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.tapeVert || false} onChange={(e) => setRetraitForm((f) => ({ ...f, tapeVert: e.target.checked }))} className="rounded" />Tape vert</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.entreposage || false} onChange={(e) => setRetraitForm((f) => ({ ...f, entreposage: e.target.checked }))} className="rounded" />Entreposage</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retraitForm.nettoyer || false} onChange={(e) => setRetraitForm((f) => ({ ...f, nettoyer: e.target.checked }))} className="rounded" />Nettoyer</label>
                  </>
                )}
              </div>
              <div className="space-y-2"><Label>Commentaires</Label><Textarea value={retraitForm.commentaires || ""} onChange={(e) => setRetraitForm((f) => ({ ...f, commentaires: e.target.value }))} /></div>
            </div>
          )}

          {/* ─── Nouvelle Installation Form ─── */}
          {activeTab === "nouvelle_installation" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>NO Projet</Label><Input value={nouvelleForm.noProjet || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, noProjet: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Nom</Label><Input value={nouvelleForm.nom || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, nom: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Adresse</Label><Input value={nouvelleForm.adresse || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, adresse: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={nouvelleForm.date || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Heure</Label><Input value={nouvelleForm.heure || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, heure: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Contact</Label><Input value={nouvelleForm.contact || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, contact: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type de tapis</Label><Input value={nouvelleForm.typeTapis || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, typeTapis: e.target.value }))} /></div>
                <div className="space-y-2"><Label>No commande</Label><Input value={nouvelleForm.noCommande || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, noCommande: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>FDP Plan</Label><Input value={nouvelleForm.fdpPlan || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, fdpPlan: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Rouleau</Label><Input value={nouvelleForm.rouleau || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, rouleau: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Courriel</Label><Input value={nouvelleForm.courriel || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, courriel: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Facture ASP</Label><Input value={nouvelleForm.factureAsp || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, factureAsp: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>H/INS</Label><Input value={nouvelleForm.hIns || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, hIns: e.target.value }))} /></div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nouvelleForm.moulure || false} onChange={(e) => setNouvelleForm((f) => ({ ...f, moulure: e.target.checked }))} className="rounded" />Moulure</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nouvelleForm.tape || false} onChange={(e) => setNouvelleForm((f) => ({ ...f, tape: e.target.checked }))} className="rounded" />Tape</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nouvelleForm.tapeVert || false} onChange={(e) => setNouvelleForm((f) => ({ ...f, tapeVert: e.target.checked }))} className="rounded" />Tape vert</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nouvelleForm.pc || false} onChange={(e) => setNouvelleForm((f) => ({ ...f, pc: e.target.checked }))} className="rounded" />PC</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nouvelleForm.fait || false} onChange={(e) => setNouvelleForm((f) => ({ ...f, fait: e.target.checked }))} className="rounded" />Fait</label>
              </div>
              <div className="space-y-2"><Label>Commentaires</Label><Textarea value={nouvelleForm.commentaires || ""} onChange={(e) => setNouvelleForm((f) => ({ ...f, commentaires: e.target.value }))} /></div>
            </div>
          )}

          {/* ─── Client Form ─── */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>#Projet</Label><Input value={clientForm.projet || ""} onChange={(e) => setClientForm((f) => ({ ...f, projet: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Nom</Label><Input value={clientForm.nom || ""} onChange={(e) => setClientForm((f) => ({ ...f, nom: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Adresse</Label><Input value={clientForm.adresse || ""} onChange={(e) => setClientForm((f) => ({ ...f, adresse: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Ville</Label><Input value={clientForm.ville || ""} onChange={(e) => setClientForm((f) => ({ ...f, ville: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Code Postal</Label><Input value={clientForm.codePostal || ""} onChange={(e) => setClientForm((f) => ({ ...f, codePostal: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Contact</Label><Input value={clientForm.contact || ""} onChange={(e) => setClientForm((f) => ({ ...f, contact: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={clientForm.email || ""} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Type batiment</Label><Input value={clientForm.typeBatiment || ""} onChange={(e) => setClientForm((f) => ({ ...f, typeBatiment: e.target.value }))} /></div>
              </div>
            </div>
          )}

          {/* ─── Commande Form ─── */}
          {activeTab === "commandes" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Commande</Label><Input value={commandeForm.commande || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, commande: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Qte</Label><Input type="number" value={commandeForm.qte || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, qte: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>#BDC Solatheque</Label><Input value={commandeForm.bdcSolatheque || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, bdcSolatheque: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={commandeForm.date || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={commandeForm.description || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Unite</Label><Input value={commandeForm.unite || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, unite: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Ref</Label><Input value={commandeForm.ref || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, ref: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Couleur</Label><Input value={commandeForm.couleur || ""} onChange={(e) => setCommandeForm((f) => ({ ...f, couleur: e.target.value }))} /></div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={commandeForm.emailEnvoye || false} onChange={(e) => setCommandeForm((f) => ({ ...f, emailEnvoye: e.target.checked }))} className="rounded" />Email envoye</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={commandeForm.pickup || false} onChange={(e) => setCommandeForm((f) => ({ ...f, pickup: e.target.checked }))} className="rounded" />Pick-up</label>
              </div>
            </div>
          )}

          {/* ─── Pickup Form ─── */}
          {activeTab === "pickup" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Ref Mat Tech</Label><Input value={pickupForm.refMatTech || ""} onChange={(e) => setPickupForm((f) => ({ ...f, refMatTech: e.target.value }))} /></div>
                <div className="space-y-2"><Label>#Commande Solatheque</Label><Input value={pickupForm.commandeSolatheque || ""} onChange={(e) => setPickupForm((f) => ({ ...f, commandeSolatheque: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Rouleaux</Label><Input type="number" value={pickupForm.rouleaux || ""} onChange={(e) => setPickupForm((f) => ({ ...f, rouleaux: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Projet</Label><Input value={pickupForm.projet || ""} onChange={(e) => setPickupForm((f) => ({ ...f, projet: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={pickupForm.description || ""} onChange={(e) => setPickupForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date commande</Label><Input type="date" value={pickupForm.dateCommande || ""} onChange={(e) => setPickupForm((f) => ({ ...f, dateCommande: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Date pickup</Label><Input type="date" value={pickupForm.datePickup || ""} onChange={(e) => setPickupForm((f) => ({ ...f, datePickup: e.target.value }))} /></div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pickupForm.fait || false} onChange={(e) => setPickupForm((f) => ({ ...f, fait: e.target.checked }))} className="rounded" />Fait</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pickupForm.moulure || false} onChange={(e) => setPickupForm((f) => ({ ...f, moulure: e.target.checked }))} className="rounded" />Moulure</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pickupForm.tape || false} onChange={(e) => setPickupForm((f) => ({ ...f, tape: e.target.checked }))} className="rounded" />Tape</label>
              </div>
            </div>
          )}

          {/* ─── Entretien Form ─── */}
          {activeTab === "entretien" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>P.O.</Label><Input value={entretienForm.po || ""} onChange={(e) => setEntretienForm((f) => ({ ...f, po: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Roul #</Label><Input value={entretienForm.roulNum || ""} onChange={(e) => setEntretienForm((f) => ({ ...f, roulNum: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Qte PL</Label><Input type="number" value={entretienForm.qtePl || ""} onChange={(e) => setEntretienForm((f) => ({ ...f, qtePl: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={entretienForm.location || ""} onChange={(e) => setEntretienForm((f) => ({ ...f, location: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={entretienForm.date || ""} onChange={(e) => setEntretienForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={entretienForm.notes || ""} onChange={(e) => setEntretienForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            </div>
          )}

          {/* ─── Inventaire Form ─── */}
          {activeTab === "inventaire" && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={inventaireForm.date || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Dura Dot</Label><Input type="number" value={inventaireForm.duraDot || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, duraDot: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Empire</Label><Input type="number" value={inventaireForm.empire || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, empire: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Needle Pin 6&apos;</Label><Input type="number" value={inventaireForm.needlePin6 || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, needlePin6: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Needle Pin 4&apos; Brun</Label><Input type="number" value={inventaireForm.needlePin4Brun || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, needlePin4Brun: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Needle Pin 4&apos; Beige</Label><Input type="number" value={inventaireForm.needlePin4Beige || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, needlePin4Beige: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Marathon</Label><Input type="number" value={inventaireForm.marathon || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, marathon: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Moulure Noir</Label><Input type="number" value={inventaireForm.moulureNoir || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, moulureNoir: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Tape Echo</Label><Input type="number" value={inventaireForm.tapeEcho || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, tapeEcho: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tape Vert</Label><Input type="number" value={inventaireForm.tapeVert || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, tapeVert: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Tape Prosol</Label><Input type="number" value={inventaireForm.tapeProsol || ""} onChange={(e) => setInventaireForm((f) => ({ ...f, tapeProsol: Number(e.target.value) }))} /></div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
