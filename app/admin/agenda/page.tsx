"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewAppointmentDialog } from "@/components/admin/new-appointment-dialog";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string; duration: number };
  employee: { id: string; name: string };
  room: { id: string; name: string; color: string };
}

interface Employee {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface RoomOption {
  id: string;
  name: string;
  color: string;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface ScheduleBlock {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  reason: string | null;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function generateTimeSlots(
  start: string,
  end: string,
  interval: number
): string[] {
  const slots: string[] = [];
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  for (let m = startMin; m < endMin; m += interval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

const SLOT_HEIGHT = 48;
const SLOT_INTERVAL = 30;

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(todayStr());

  // Action menu
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  // Block dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    employeeId: "",
    startDate: todayStr(),
    endDate: todayStr(),
    allDay: true,
    startTime: "09:00",
    endTime: "18:00",
    reason: "",
  });
  const [blockSaving, setBlockSaving] = useState(false);

  // Block detail dialog
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [blockDetailOpen, setBlockDetailOpen] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState(false);

  // New appointment dialog
  const [newAptOpen, setNewAptOpen] = useState(false);
  const [newAptStep, setNewAptStep] = useState(1);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [allRooms, setAllRooms] = useState<RoomOption[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [newAptForm, setNewAptForm] = useState({
    serviceId: "",
    employeeId: "",
    roomId: "",
    date: todayStr(),
    startTime: "09:00",
    clientId: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    notes: "",
    isNewClient: false,
  });
  const [newAptSaving, setNewAptSaving] = useState(false);
  const [newAptError, setNewAptError] = useState("");

  // Appointment detail dialog
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [aptDetailOpen, setAptDetailOpen] = useState(false);
  const [aptNotes, setAptNotes] = useState("");
  const [aptSaving, setAptSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aptRes, empRes, blockRes] = await Promise.all([
        fetch(`/api/appointments?date=${currentDate}`),
        fetch("/api/employees?active=true"),
        fetch(
          `/api/schedule-blocks?startDate=${currentDate}&endDate=${currentDate}`
        ),
      ]);
      const [aptData, empData] = await Promise.all([
        aptRes.json(),
        empRes.json(),
      ]);
      let blockData: ScheduleBlock[] = [];
      if (blockRes.ok) {
        blockData = await blockRes.json();
      }
      setAppointments(Array.isArray(aptData) ? aptData : []);
      setEmployees(
        (empData || []).map(
          (e: Employee & { employeeServices?: unknown[] }) => ({
            id: e.id,
            name: e.name,
            photoUrl: e.photoUrl,
          })
        )
      );
      setBlocks(Array.isArray(blockData) ? blockData : []);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeSlots = useMemo(
    () => generateTimeSlots("08:00", "20:00", SLOT_INTERVAL),
    []
  );

  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status !== "cancelled"),
    [appointments]
  );

  const getEmployeeAppointments = useCallback(
    (employeeId: string) =>
      activeAppointments.filter((a) => a.employee.id === employeeId),
    [activeAppointments]
  );

  const getEmployeeBlocks = useCallback(
    (employeeId: string) =>
      blocks.filter((b) => b.employeeId === employeeId),
    [blocks]
  );

  const getAppointmentStyle = useCallback(
    (apt: Appointment) => {
      const firstSlotMin = timeToMinutes(timeSlots[0]);
      const startMin = timeToMinutes(apt.startTime);
      const endMin = timeToMinutes(apt.endTime);
      const durationSlots = (endMin - startMin) / SLOT_INTERVAL;
      const offsetSlots = (startMin - firstSlotMin) / SLOT_INTERVAL;
      return {
        top: offsetSlots * SLOT_HEIGHT,
        height: durationSlots * SLOT_HEIGHT - 4,
      };
    },
    [timeSlots]
  );

  const getBlockStyle = useCallback(
    (block: ScheduleBlock) => {
      const firstSlotMin = timeToMinutes(timeSlots[0]);
      const lastSlotMin = timeToMinutes(timeSlots[timeSlots.length - 1]) + SLOT_INTERVAL;
      const startMin = block.allDay
        ? firstSlotMin
        : timeToMinutes(block.startTime || "08:00");
      const endMin = block.allDay
        ? lastSlotMin
        : timeToMinutes(block.endTime || "20:00");
      const durationSlots = (endMin - startMin) / SLOT_INTERVAL;
      const offsetSlots = (startMin - firstSlotMin) / SLOT_INTERVAL;
      return {
        top: offsetSlots * SLOT_HEIGHT,
        height: durationSlots * SLOT_HEIGHT - 4,
      };
    },
    [timeSlots]
  );

  const handleCreateBlock = async () => {
    if (!blockForm.employeeId) return;
    setBlockSaving(true);
    try {
      await fetch("/api/schedule-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: blockForm.employeeId,
          startDate: blockForm.startDate,
          endDate: blockForm.endDate,
          allDay: blockForm.allDay,
          startTime: blockForm.allDay ? null : blockForm.startTime,
          endTime: blockForm.allDay ? null : blockForm.endTime,
          reason: blockForm.reason || null,
        }),
      });
      setBlockDialogOpen(false);
      setBlockForm({
        employeeId: "",
        startDate: todayStr(),
        endDate: todayStr(),
        allDay: true,
        startTime: "09:00",
        endTime: "18:00",
        reason: "",
      });
      fetchData();
    } finally {
      setBlockSaving(false);
    }
  };

  const handleOpenAptDetail = (apt: Appointment) => {
    setSelectedApt(apt);
    setAptNotes(apt.notes || "");
    setAptDetailOpen(true);
  };

  const handleUpdateAptStatus = async (status: string) => {
    if (!selectedApt) return;
    setAptSaving(true);
    try {
      await fetch(`/api/appointments/${selectedApt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: aptNotes }),
      });
      setAptDetailOpen(false);
      fetchData();
    } finally {
      setAptSaving(false);
    }
  };

  const handleDeleteBlock = async () => {
    if (!selectedBlock) return;
    setDeletingBlock(true);
    try {
      await fetch(`/api/schedule-blocks?id=${selectedBlock.id}`, {
        method: "DELETE",
      });
      setBlockDetailOpen(false);
      setSelectedBlock(null);
      fetchData();
    } finally {
      setDeletingBlock(false);
    }
  };

  const openNewAppointment = async () => {
    setNewAptOpen(true);
    setNewAptStep(1);
    setNewAptError("");
    setNewAptForm({
      serviceId: "",
      employeeId: "",
      roomId: "",
      date: currentDate,
      startTime: "09:00",
      clientId: "",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      notes: "",
      isNewClient: false,
    });
    setClientSearch("");
    setClientResults([]);
    try {
      const [svcRes, roomRes] = await Promise.all([
        fetch("/api/services?active=true"),
        fetch("/api/rooms?active=true"),
      ]);
      setAllServices(await svcRes.json());
      setAllRooms(await roomRes.json());
    } catch {}
  };

  const searchClients = async (query: string) => {
    setClientSearch(query);
    if (query.length < 2) {
      setClientResults([]);
      return;
    }
    setClientSearching(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setClientResults(data.slice(0, 10));
      }
    } finally {
      setClientSearching(false);
    }
  };

  const handleCreateAppointment = async () => {
    setNewAptError("");
    setNewAptSaving(true);
    try {
      let clientId = newAptForm.clientId;

      // Create new client if needed
      if (newAptForm.isNewClient) {
        if (!newAptForm.clientName || !newAptForm.clientPhone) {
          setNewAptError("Nome e telefone do cliente são obrigatórios.");
          setNewAptSaving(false);
          return;
        }
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newAptForm.clientName,
            phone: newAptForm.clientPhone,
            email: newAptForm.clientEmail || null,
          }),
        });
        if (!clientRes.ok) {
          setNewAptError("Erro ao criar cliente.");
          setNewAptSaving(false);
          return;
        }
        const newClient = await clientRes.json();
        clientId = newClient.id;
      }

      if (!clientId) {
        setNewAptError("Selecione ou cadastre um cliente.");
        setNewAptSaving(false);
        return;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceId: newAptForm.serviceId,
          employeeId: newAptForm.employeeId,
          roomId: newAptForm.roomId,
          date: newAptForm.date,
          startTime: newAptForm.startTime,
          notes: newAptForm.notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNewAptError(err.error || "Erro ao criar agendamento.");
        return;
      }

      setNewAptOpen(false);
      fetchData();
    } finally {
      setNewAptSaving(false);
    }
  };

  const selectedService = allServices.find((s) => s.id === newAptForm.serviceId);

  const handleSaveAptNotes = async () => {
    if (!selectedApt) return;
    setAptSaving(true);
    try {
      await fetch(`/api/appointments/${selectedApt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: aptNotes }),
      });
      setAptDetailOpen(false);
      fetchData();
    } finally {
      setAptSaving(false);
    }
  };

  const isToday = currentDate === todayStr();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold">Agenda</h1>
          <p className="text-muted-foreground mt-1 text-sm capitalize">
            {formatDateDisplay(currentDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
          >
            &larr; Anterior
          </Button>
          <Button
            variant={isToday ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentDate(todayStr())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
          >
            Próximo &rarr;
          </Button>

          {/* Action button */}
          <div className="relative" ref={actionRef}>
            <Button
              size="sm"
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Ações
            </Button>
            {actionMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => {
                    setActionMenuOpen(false);
                    openNewAppointment();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Novo Agendamento
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => {
                    setActionMenuOpen(false);
                    setBlockDialogOpen(true);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  Bloquear Horário
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Employee header row */}
              <div
                className="flex border-b border-border sticky top-0 bg-card z-10"
                style={{ paddingLeft: 64 }}
              >
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex-1 min-w-[180px] py-4 px-2 text-center border-l border-border/50"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{emp.name}</span>
                      <span
                        className="text-[11px] text-muted-foreground"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {getEmployeeAppointments(emp.id).length} agendamento
                        {getEmployeeAppointments(emp.id).length !== 1
                          ? "s"
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="relative flex" style={{ paddingLeft: 64 }}>
                {/* Time labels column */}
                <div
                  className="absolute left-0 top-0 w-[64px] z-10"
                  style={{ height: timeSlots.length * SLOT_HEIGHT }}
                >
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="flex items-start justify-end pr-3"
                      style={{
                        height: SLOT_HEIGHT,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <span className="text-xs text-muted-foreground -mt-2">
                        {time}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Employee columns */}
                {employees.map((emp) => {
                  const empAppointments = getEmployeeAppointments(emp.id);
                  const empBlocks = getEmployeeBlocks(emp.id);

                  return (
                    <div
                      key={emp.id}
                      className="flex-1 min-w-[180px] relative border-l border-border/50"
                      style={{ height: timeSlots.length * SLOT_HEIGHT }}
                    >
                      {/* Horizontal time grid lines */}
                      {timeSlots.map((time, idx) => (
                        <div
                          key={time}
                          className="absolute left-0 right-0 border-b border-border/30"
                          style={{ top: idx * SLOT_HEIGHT + SLOT_HEIGHT }}
                        />
                      ))}

                      {/* Block overlays */}
                      {empBlocks.map((block) => {
                        const pos = getBlockStyle(block);
                        return (
                          <div
                            key={block.id}
                            className="absolute left-0 right-0 bg-destructive/10 border border-destructive/20 flex items-center justify-center cursor-pointer hover:bg-destructive/15 transition-colors rounded"
                            style={{
                              top: pos.top + 2,
                              height: pos.height,
                              zIndex: 3,
                            }}
                            onClick={() => {
                              setSelectedBlock(block);
                              setBlockDetailOpen(true);
                            }}
                          >
                            <div className="text-center">
                              <p className="text-xs font-medium text-destructive">
                                Bloqueado
                              </p>
                              {block.reason && (
                                <p className="text-[10px] text-muted-foreground">
                                  {block.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Appointment blocks */}
                      {empAppointments.map((apt) => {
                        const pos = getAppointmentStyle(apt);
                        return (
                          <div
                            key={apt.id}
                            className="absolute left-1 right-1 rounded-lg px-2.5 py-1.5 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                            style={{
                              top: pos.top + 2,
                              height: pos.height,
                              backgroundColor: apt.room.color,
                              color: "#fff",
                              zIndex: 5,
                            }}
                            onClick={() => handleOpenAptDetail(apt)}
                          >
                            <p
                              className="text-[11px] font-semibold opacity-90"
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {apt.startTime} - {apt.endTime}
                            </p>
                            <p className="text-sm font-medium leading-tight truncate">
                              {apt.client.name}
                            </p>
                            <p className="text-[11px] opacity-85 leading-tight truncate mt-0.5">
                              {apt.service.name}
                            </p>
                            {pos.height > 60 && (
                              <p className="text-[10px] opacity-75 truncate mt-0.5">
                                {apt.room.name}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {employees.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  Nenhuma colaboradora cadastrada
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Appointment Dialog */}
      <NewAppointmentDialog
        open={newAptOpen}
        onOpenChange={setNewAptOpen}
        onCreated={fetchData}
        defaultDate={currentDate}
      />

      {/* OLD INLINE DIALOG - HIDDEN */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {newAptError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {newAptError}
              </div>
            )}

            {/* Step indicators */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={newAptStep >= 1 ? "text-primary font-medium" : ""}>Serviço</span>
              <span>→</span>
              <span className={newAptStep >= 2 ? "text-primary font-medium" : ""}>Profissional</span>
              <span>→</span>
              <span className={newAptStep >= 3 ? "text-primary font-medium" : ""}>Data/Hora</span>
              <span>→</span>
              <span className={newAptStep >= 4 ? "text-primary font-medium" : ""}>Cliente</span>
            </div>

            {/* Step 1: Service */}
            {newAptStep === 1 && (
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {allServices.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        newAptForm.serviceId === svc.id
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setNewAptForm({ ...newAptForm, serviceId: svc.id });
                        setNewAptStep(2);
                      }}
                    >
                      <p className="font-medium text-sm">{svc.name}</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {svc.duration}min · {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(svc.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Employee + Room */}
            {newAptStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className={`p-3 rounded-lg border transition-colors text-center ${
                          newAptForm.employeeId === emp.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setNewAptForm({ ...newAptForm, employeeId: emp.id })
                        }
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs mx-auto mb-1">
                          {emp.name.charAt(0)}
                        </div>
                        <p className="text-sm font-medium">{emp.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sala *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {allRooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        className={`p-3 rounded-lg border transition-colors text-left flex items-center gap-2 ${
                          newAptForm.roomId === room.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setNewAptForm({ ...newAptForm, roomId: room.id })
                        }
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: room.color }}
                        />
                        <p className="text-sm">{room.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setNewAptStep(1)}>
                    ← Voltar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setNewAptStep(3)}
                    disabled={!newAptForm.employeeId || !newAptForm.roomId}
                  >
                    Próximo →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Date + Time */}
            {newAptStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={newAptForm.date}
                      onChange={(e) =>
                        setNewAptForm({ ...newAptForm, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora *</Label>
                    <Input
                      type="time"
                      step="1800"
                      value={newAptForm.startTime}
                      onChange={(e) =>
                        setNewAptForm({ ...newAptForm, startTime: e.target.value })
                      }
                    />
                  </div>
                </div>
                {selectedService && (
                  <p className="text-xs text-muted-foreground">
                    Duração: {selectedService.duration}min — Término previsto:{" "}
                    <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {(() => {
                        const [h, m] = newAptForm.startTime.split(":").map(Number);
                        const endMin = h * 60 + m + selectedService.duration;
                        return `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
                      })()}
                    </span>
                  </p>
                )}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={newAptForm.notes}
                    onChange={(e) =>
                      setNewAptForm({ ...newAptForm, notes: e.target.value })
                    }
                    placeholder="Observações sobre o agendamento..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setNewAptStep(2)}>
                    ← Voltar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setNewAptStep(4)}
                    disabled={!newAptForm.date || !newAptForm.startTime}
                  >
                    Próximo →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Client */}
            {newAptStep === 4 && (
              <div className="space-y-4">
                {!newAptForm.isNewClient ? (
                  <>
                    <div className="space-y-2">
                      <Label>Buscar cliente existente</Label>
                      <Input
                        placeholder="Nome, telefone ou email..."
                        value={clientSearch}
                        onChange={(e) => searchClients(e.target.value)}
                      />
                    </div>
                    {clientSearching && (
                      <p className="text-xs text-muted-foreground">Buscando...</p>
                    )}
                    {clientResults.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {clientResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              newAptForm.clientId === c.id
                                ? "border-primary bg-primary/5"
                                : "border-border/50 hover:bg-muted/50"
                            }`}
                            onClick={() =>
                              setNewAptForm({
                                ...newAptForm,
                                clientId: c.id,
                                clientName: c.name,
                              })
                            }
                          >
                            <p className="font-medium text-sm">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.phone}
                              {c.email ? ` · ${c.email}` : ""}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {newAptForm.clientId && (
                      <p className="text-sm text-primary font-medium">
                        Selecionado: {newAptForm.clientName}
                      </p>
                    )}
                    <Separator />
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() =>
                        setNewAptForm({
                          ...newAptForm,
                          isNewClient: true,
                          clientId: "",
                        })
                      }
                    >
                      + Cadastrar novo cliente
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Novo Cliente</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={newAptForm.clientName}
                          onChange={(e) =>
                            setNewAptForm({ ...newAptForm, clientName: e.target.value })
                          }
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telemóvel *</Label>
                        <Input
                          value={newAptForm.clientPhone}
                          onChange={(e) =>
                            setNewAptForm({ ...newAptForm, clientPhone: e.target.value })
                          }
                          placeholder="+351 9XX XXX XXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newAptForm.clientEmail}
                          onChange={(e) =>
                            setNewAptForm({ ...newAptForm, clientEmail: e.target.value })
                          }
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() =>
                        setNewAptForm({
                          ...newAptForm,
                          isNewClient: false,
                          clientName: "",
                          clientPhone: "",
                          clientEmail: "",
                        })
                      }
                    >
                      ← Buscar cliente existente
                    </button>
                  </>
                )}

                <Separator />

                {/* Summary */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Resumo</p>
                  <p className="text-sm">
                    <strong>Serviço:</strong>{" "}
                    {allServices.find((s) => s.id === newAptForm.serviceId)?.name}
                  </p>
                  <p className="text-sm">
                    <strong>Profissional:</strong>{" "}
                    {employees.find((e) => e.id === newAptForm.employeeId)?.name}
                  </p>
                  <p className="text-sm">
                    <strong>Sala:</strong>{" "}
                    {allRooms.find((r) => r.id === newAptForm.roomId)?.name}
                  </p>
                  <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <strong style={{ fontFamily: "inherit" }}>Data/Hora:</strong>{" "}
                    {new Date(newAptForm.date + "T12:00:00").toLocaleDateString("pt-PT")} às{" "}
                    {newAptForm.startTime}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setNewAptStep(3)}>
                    ← Voltar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreateAppointment}
                    disabled={
                      newAptSaving ||
                      (!newAptForm.clientId && !newAptForm.isNewClient) ||
                      (newAptForm.isNewClient && (!newAptForm.clientName || !newAptForm.clientPhone))
                    }
                  >
                    {newAptSaving ? "Salvando..." : "Confirmar Agendamento"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Schedule Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Profissional *</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={blockForm.employeeId}
                onChange={(e) =>
                  setBlockForm({ ...blockForm, employeeId: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data Inicial *</Label>
                <Input
                  type="date"
                  value={blockForm.startDate}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final *</Label>
                <Input
                  type="date"
                  value={blockForm.endDate}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <Label className="cursor-pointer">Ocupar o dia todo</Label>
              <Switch
                checked={blockForm.allDay}
                onCheckedChange={(checked) =>
                  setBlockForm({ ...blockForm, allDay: checked })
                }
              />
            </div>

            {!blockForm.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Hora Inicial</Label>
                  <Input
                    type="time"
                    value={blockForm.startTime}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Final</Label>
                  <Input
                    type="time"
                    value={blockForm.endTime}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                value={blockForm.reason}
                onChange={(e) =>
                  setBlockForm({ ...blockForm, reason: e.target.value })
                }
                placeholder="Ex: Férias, consulta médica..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBlockDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateBlock}
                disabled={blockSaving || !blockForm.employeeId}
              >
                {blockSaving ? "Salvando..." : "Bloquear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Detail Dialog */}
      <Dialog open={blockDetailOpen} onOpenChange={setBlockDetailOpen}>
        <DialogContent className="max-w-sm">
          {selectedBlock && (
            <>
              <DialogHeader>
                <DialogTitle>Bloqueio de Horário</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Profissional</p>
                  <p className="font-medium">
                    {employees.find((e) => e.id === selectedBlock.employeeId)
                      ?.name || "-"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p
                      className="text-sm font-medium"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {selectedBlock.allDay
                        ? "Dia todo"
                        : `${selectedBlock.startTime} - ${selectedBlock.endTime}`}
                    </p>
                  </div>
                </div>
                {selectedBlock.reason && (
                  <div>
                    <p className="text-xs text-muted-foreground">Motivo</p>
                    <p className="text-sm">{selectedBlock.reason}</p>
                  </div>
                )}
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setBlockDetailOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteBlock}
                    disabled={deletingBlock}
                  >
                    {deletingBlock ? "Excluindo..." : "Excluir Bloqueio"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Dialog */}
      <Dialog open={aptDetailOpen} onOpenChange={setAptDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedApt && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Agendamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedApt.client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApt.client.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      className={
                        selectedApt.status === "confirmed"
                          ? "bg-blue-100 text-blue-700"
                          : selectedApt.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                      variant="secondary"
                    >
                      {selectedApt.status === "confirmed"
                        ? "Confirmado"
                        : selectedApt.status === "completed"
                        ? "Concluído"
                        : "Cancelado"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Procedimento
                    </p>
                    <p className="font-medium">{selectedApt.service.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Profissional
                    </p>
                    <p className="font-medium">{selectedApt.employee.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Horário</p>
                    <p
                      className="font-medium"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {selectedApt.startTime} - {selectedApt.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sala</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedApt.room.color }}
                      />
                      <p className="font-medium">{selectedApt.room.name}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={aptNotes}
                    onChange={(e) => setAptNotes(e.target.value)}
                    placeholder="Adicionar observações..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/admin/clientes/${selectedApt.client.id}`,
                        "_blank"
                      )
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Ver Cliente
                  </Button>

                  {aptNotes !== (selectedApt.notes || "") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAptNotes}
                      disabled={aptSaving}
                    >
                      Salvar Notas
                    </Button>
                  )}

                  <div className="flex-1" />

                  {selectedApt.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateAptStatus("completed")}
                        disabled={aptSaving}
                      >
                        Concluir
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateAptStatus("cancelled")}
                        disabled={aptSaving}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
