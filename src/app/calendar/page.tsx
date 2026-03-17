"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  in_progress: "#F97316",
  completed: "#22C55E",
  cancelled: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TAPIS_TYPE_COLORS: Record<string, string> = {
  retrait: "#3B82F6",           // blue
  reinstallation: "#22C55E",    // green
  nouvelle_installation: "#F97316", // orange
  enlevement: "#EF4444",        // red
};

const TAPIS_TYPE_LABELS: Record<string, string> = {
  retrait: "Retrait",
  reinstallation: "Réinstallation",
  nouvelle_installation: "Nouvelle Installation",
  enlevement: "Enlèvement",
};

type ServiceTab = "commercial" | "tapis";
type ViewMode = "calendar" | "team";

interface Appointment {
  id: string;
  customerName: string;
  customerPhone?: string;
  propertyAddress?: string;
  damageType?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  serviceType?: string;
  technician?: { id: string; name: string };
  technicianId?: string;
}

interface Technician {
  id: string;
  name: string;
}

interface TapisJob {
  id: string;
  jobType: string;
  scheduledDate: string;
  hours: string;
  crewSize: number;
  client: {
    name: string;
    address: string;
    city: string;
  };
  fait: boolean;
  confirmation: boolean;
}

export default function CalendarPage() {
  const calendarRef = useRef<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [tapisJobs, setTapisJobs] = useState<TapisJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceTab, setServiceTab] = useState<ServiceTab>("commercial");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    propertyAddress: "",
    damageType: "",
    scheduledAt: "",
    time: "09:00",
    duration: 60,
    status: "pending",
    serviceType: "commercial",
    technicianId: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, techRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/technicians"),
      ]);
      if (apptRes.ok) setAppointments(await apptRes.json());
      if (techRes.ok) setTechnicians(await techRes.json());
      if (serviceTab === "tapis") {
        const tapisRes = await fetch(`/api/tapis/jobs?year=${new Date().getFullYear()}`);
        if (tapisRes.ok) setTapisJobs(await tapisRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [serviceTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter appointments by service tab
  const filtered = appointments.filter((a) => {
    const type = a.serviceType || a.damageType || "commercial";
    if (serviceTab === "tapis") {
      return type.toLowerCase().includes("tapis") || type.toLowerCase().includes("carpet");
    }
    return !type.toLowerCase().includes("tapis") && !type.toLowerCase().includes("carpet");
  });

  // Parse tapis hours string like "7h30-11h" or "8h-12h30"
  const parseTapisHours = (dateStr: string, hours: string) => {
    const parts = hours.split("-");
    const parseTime = (t: string) => {
      const m = t.match(/(\d+)h(\d+)?/);
      if (!m) return { h: 9, m: 0 };
      return { h: parseInt(m[1]), m: parseInt(m[2] || "0") };
    };
    const startT = parseTime(parts[0] || "9h");
    const endT = parts[1] ? parseTime(parts[1]) : { h: startT.h + 2, m: startT.m };
    const start = new Date(dateStr);
    start.setHours(startT.h, startT.m, 0, 0);
    const end = new Date(dateStr);
    end.setHours(endT.h, endT.m, 0, 0);
    return { start, end };
  };

  // Convert to FullCalendar events
  const appointmentEvents = filtered.map((a) => {
    const start = new Date(a.scheduledAt);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (a.duration || 60));
    return {
      id: a.id,
      title: `${a.customerName || "Appointment"}${a.technician?.name ? ` — ${a.technician.name}` : ""}`,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: STATUS_COLORS[a.status] || STATUS_COLORS.pending,
      borderColor: STATUS_COLORS[a.status] || STATUS_COLORS.pending,
      extendedProps: a,
    };
  });

  const tapisEvents = tapisJobs.map((job) => {
    const { start, end } = parseTapisHours(job.scheduledDate, job.hours);
    const color = TAPIS_TYPE_COLORS[job.jobType] || "#6B7280";
    const label = TAPIS_TYPE_LABELS[job.jobType] || job.jobType;
    return {
      id: `tapis-${job.id}`,
      title: `${job.client.name} — ${job.client.address} (${job.crewSize}👷)`,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: color,
      borderColor: color,
      extendedProps: { ...job, _isTapis: true, _typeLabel: label },
    };
  });

  const events = serviceTab === "tapis" ? [...appointmentEvents, ...tapisEvents] : appointmentEvents;

  // Team schedule: group by technician
  const teamSchedule = technicians.map((tech) => ({
    ...tech,
    appointments: filtered.filter(
      (a) => a.technicianId === tech.id || a.technician?.id === tech.id
    ),
  }));

  const handleDateClick = (info: any) => {
    setForm({
      ...form,
      scheduledAt: info.dateStr.split("T")[0],
      time: info.dateStr.includes("T") ? info.dateStr.split("T")[1].slice(0, 5) : "09:00",
      serviceType: serviceTab,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.scheduledAt}T${form.time}`).toISOString();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          propertyAddress: form.propertyAddress,
          damageType: form.serviceType === "tapis" ? "tapis" : form.damageType,
          scheduledAt,
          duration: form.duration,
          status: form.status,
          technicianId: form.technicianId || undefined,
          serviceType: form.serviceType,
        }),
      });
      if (res.ok) {
        toast.success("Appointment created");
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error("Failed to create appointment");
      }
    } catch {
      toast.error("Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Calendrier">
      <div className="space-y-4">
        {/* Service tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setServiceTab("commercial")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                serviceTab === "commercial"
                  ? "bg-[#DC7418] text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              Travaux commerciaux
            </button>
            <button
              onClick={() => setServiceTab("tapis")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                serviceTab === "tapis"
                  ? "bg-[#DC7418] text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              Service de tapis
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Status / Tapis type legend */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              {serviceTab === "tapis"
                ? Object.entries(TAPIS_TYPE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: TAPIS_TYPE_COLORS[key] }}
                      />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                  ))
                : Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[key] }}
                      />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                  ))}
            </div>

            <div className="flex rounded-lg border">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  viewMode === "calendar"
                    ? "bg-[#DC7418] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode("team")}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  viewMode === "team"
                    ? "bg-[#DC7418] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Team Schedule
              </button>
            </div>

            <Button onClick={() => { setForm({ ...form, serviceType: serviceTab }); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Calendar or Team view */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DC7418] border-t-transparent" />
          </div>
        ) : viewMode === "calendar" ? (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              dateClick={handleDateClick}
              editable={false}
              selectable={true}
              nowIndicator={true}
              allDaySlot={true}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              height="auto"
              eventClick={(info) => {
                const props = info.event.extendedProps;
                if (props._isTapis) {
                  const job = props as TapisJob & { _typeLabel: string };
                  toast.info(
                    `${job._typeLabel}: ${job.client.name} — ${job.client.address}, ${job.client.city} (${job.crewSize} crew)${job.fait ? " ✓ Fait" : ""}`
                  );
                } else {
                  const appt = props as Appointment;
                  toast.info(
                    `${appt.customerName || "Appointment"} — ${appt.status}${
                      appt.propertyAddress ? ` — ${appt.propertyAddress}` : ""
                    }`
                  );
                }
              }}
            />
          </div>
        ) : (
          /* Team Schedule view */
          <div className="space-y-4">
            {serviceTab === "tapis" ? (
              /* Tapis jobs grouped by date */
              (() => {
                const byDate: Record<string, TapisJob[]> = {};
                tapisJobs.forEach((job) => {
                  const d = job.scheduledDate.split("T")[0];
                  if (!byDate[d]) byDate[d] = [];
                  byDate[d].push(job);
                });
                const sortedDates = Object.keys(byDate).sort();
                return sortedDates.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-12 text-center">
                    <p className="text-gray-500">No tapis jobs found.</p>
                  </div>
                ) : (
                  sortedDates.map((date) => (
                    <div key={date} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#FDE4C4] flex items-center justify-center">
                            <span className="text-sm font-medium text-[#B8610E]">📅</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{new Date(date + "T00:00:00").toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                            <p className="text-xs text-gray-500">
                              {byDate[date].length} job{byDate[date].length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y">
                        {byDate[date].map((job) => (
                          <div key={job.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: TAPIS_TYPE_COLORS[job.jobType] || "#6B7280" }}
                              />
                              <div>
                                <p className="text-sm font-medium">{job.client.name}</p>
                                <p className="text-xs text-gray-500">{job.client.address}, {job.client.city}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: TAPIS_TYPE_COLORS[job.jobType] || "#6B7280" }}>
                                  {TAPIS_TYPE_LABELS[job.jobType] || job.jobType}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {job.hours} — {job.crewSize} crew
                                {job.fait ? " ✓" : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                );
              })()
            ) : (
              /* Commercial: group by technician */
              teamSchedule.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-12 text-center">
                  <p className="text-gray-500">No team members found. Add team members in the Team page.</p>
                </div>
              ) : (
                teamSchedule.map((tech) => (
                  <div key={tech.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FDE4C4] flex items-center justify-center">
                          <span className="text-sm font-medium text-[#B8610E]">{tech.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tech.name}</p>
                          <p className="text-xs text-gray-500">
                            {tech.appointments.length} appointment{tech.appointments.length !== 1 ? "s" : ""} this week
                          </p>
                        </div>
                      </div>
                    </div>
                    {tech.appointments.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No appointments scheduled</div>
                    ) : (
                      <div className="divide-y">
                        {tech.appointments
                          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                          .map((appt) => (
                            <div key={appt.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <span
                                  className="inline-block h-3 w-3 rounded-full"
                                  style={{ backgroundColor: STATUS_COLORS[appt.status] || STATUS_COLORS.pending }}
                                />
                                <div>
                                  <p className="text-sm font-medium">{appt.customerName || "Appointment"}</p>
                                  <p className="text-xs text-gray-500">{appt.propertyAddress}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">{new Date(appt.scheduledAt).toLocaleDateString()}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {" — "}
                                  {appt.duration}min
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setForm((f) => ({ ...f, serviceType: "commercial" }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                    form.serviceType === "commercial" ? "bg-[#DC7418] text-white border-[#DC7418]" : "text-gray-600"
                  }`}
                >
                  Travaux commerciaux
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, serviceType: "tapis" }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                    form.serviceType === "tapis" ? "bg-[#DC7418] text-white border-[#DC7418]" : "text-gray-600"
                  }`}
                >
                  Service de tapis
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={form.technicianId} onValueChange={(v) => setForm((f) => ({ ...f, technicianId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.propertyAddress} onChange={(e) => setForm((f) => ({ ...f, propertyAddress: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
