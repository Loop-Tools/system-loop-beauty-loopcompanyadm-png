"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────

interface RoomRef {
  id: string;
  name: string;
  color: string;
  active?: boolean;
}

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: number;
  groupId: string | null;
  roomServices: { room: RoomRef }[];
}

interface ServiceGroup {
  id: string;
  name: string;
  services: { id: string; name: string; duration: number; price: number }[];
}

interface EmployeeOption {
  id: string;
  name: string;
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

// ── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// ── Component ──────────────────────────────────────────────────────

export function NewAppointmentDialog({
  open,
  onOpenChange,
  onCreated,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultDate?: string;
}) {
  // Data sources
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  // Client search
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Service search
  const [serviceSearch, setServiceSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    groupId: "",
    serviceId: "",
    employeeId: "",
    roomId: "",
    date: defaultDate || todayStr(),
    startTime: "09:00",
    customDuration: 0, // 0 = use service default
    status: "confirmed",
    clientId: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    notes: "",
    isNewClient: false,
    sendReminder: true,
  });

  // Selected client display name (for existing clients)
  const [selectedClientName, setSelectedClientName] = useState("");

  // ── Data loading ─────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (loaded) return;
    try {
      const [grpRes, svcRes, empRes, roomRes] = await Promise.all([
        fetch("/api/service-groups"),
        fetch("/api/services?active=true"),
        fetch("/api/employees?active=true"),
        fetch("/api/rooms?active=true"),
      ]);
      setGroups(await grpRes.json());
      setServices(await svcRes.json());
      const empData = await empRes.json();
      setEmployees(
        empData.map((e: EmployeeOption) => ({ id: e.id, name: e.name }))
      );
      setRooms(await roomRes.json());
      setLoaded(true);
    } catch {
      // silent
    }
  }, [loaded]);

  useEffect(() => {
    if (open && !loaded) {
      loadData();
    }
  }, [open, loaded, loadData]);

  // ── Close outside click for client dropdown ──────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────

  const selectedService = services.find((s) => s.id === form.serviceId);

  // Services filtered by selected group and search
  const filteredServices = services.filter((s) => {
    if (form.groupId && s.groupId !== form.groupId) return false;
    if (serviceSearch && !s.name.toLowerCase().includes(serviceSearch.toLowerCase())) return false;
    return true;
  });

  // Valid rooms for selected service
  const validRoomIds = selectedService
    ? selectedService.roomServices.map((rs) => rs.room.id)
    : [];
  const serviceRooms =
    validRoomIds.length > 0
      ? rooms.filter((r) => validRoomIds.includes(r.id))
      : rooms;

  // Auto-select room if only one valid room
  useEffect(() => {
    if (selectedService && validRoomIds.length === 1) {
      setForm((prev) => ({ ...prev, roomId: validRoomIds[0] }));
    } else if (selectedService && validRoomIds.length > 0 && form.roomId) {
      // If current room is not valid for this service, clear it
      if (!validRoomIds.includes(form.roomId)) {
        setForm((prev) => ({ ...prev, roomId: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.serviceId]);

  // Selected group name for the summary line
  const selectedGroup = groups.find((g) => g.id === form.groupId);

  // ── Client search ────────────────────────────────────────────────

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClientSearchChange(query: string) {
    setClientSearch(query);
    setShowClientDropdown(true);

    // Clear previous selection if typing
    if (form.clientId) {
      setForm((prev) => ({ ...prev, clientId: "" }));
      setSelectedClientName("");
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setClientResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await fetch(
          `/api/clients?search=${encodeURIComponent(query)}`
        );
        if (res.ok) setClientResults((await res.json()).slice(0, 8));
      } finally {
        setClientSearching(false);
      }
    }, 300);
  }

  function selectClient(client: ClientOption) {
    setForm((prev) => ({ ...prev, clientId: client.id, isNewClient: false }));
    setSelectedClientName(client.name);
    setClientSearch(client.name);
    setClientResults([]);
    setShowClientDropdown(false);
  }

  // ── Reset on close ──────────────────────────────────────────────

  function handleOpenChange(val: boolean) {
    if (!val) {
      setError("");
      setLoaded(false);
      setForm({
        groupId: "",
        serviceId: "",
        employeeId: "",
        roomId: "",
        date: defaultDate || todayStr(),
        startTime: "09:00",
        customDuration: 0,
        status: "confirmed",
        clientId: "",
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        notes: "",
        isNewClient: false,
        sendReminder: true,
      });
      setServiceSearch("");
      setClientSearch("");
      setClientResults([]);
      setSelectedClientName("");
      setShowClientDropdown(false);
    }
    onOpenChange(val);
  }

  // ── Submit ──────────────────────────────────────────────────────

  async function handleCreate() {
    setError("");

    // Validation
    if (!form.clientId && !form.isNewClient) {
      setError("Selecione ou cadastre um cliente.");
      return;
    }
    if (form.isNewClient && (!form.clientName || !form.clientPhone)) {
      setError("Nome e telemóvel do cliente são obrigatórios.");
      return;
    }
    if (!form.serviceId) {
      setError("Selecione um serviço.");
      return;
    }
    if (!form.employeeId) {
      setError("Selecione um profissional.");
      return;
    }
    if (!form.roomId) {
      setError("Selecione uma sala.");
      return;
    }
    if (!form.date || !form.startTime) {
      setError("Data e hora são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      let clientId = form.clientId;

      // Create new client if needed
      if (form.isNewClient) {
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.clientName,
            phone: form.clientPhone,
            email: form.clientEmail || null,
          }),
        });
        if (!clientRes.ok) {
          setError("Erro ao criar cliente.");
          setSaving(false);
          return;
        }
        const newClient = await clientRes.json();
        clientId = newClient.id;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceId: form.serviceId,
          employeeId: form.employeeId,
          roomId: form.roomId,
          date: form.date,
          startTime: form.startTime,
          customDuration: form.customDuration || undefined,
          notes: form.notes || null,
          sendReminder: form.sendReminder,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erro ao criar agendamento.");
        return;
      }

      handleOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Row 1: Cliente, Data + Hora, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cliente */}
            <div className="space-y-2 relative sm:col-span-2 lg:col-span-1" ref={clientRef}>
              <Label>Cliente *</Label>
              {!form.isNewClient ? (
                <>
                  <Input
                    placeholder="Pesquisar cliente..."
                    value={clientSearch}
                    onChange={(e) => handleClientSearchChange(e.target.value)}
                    onFocus={() => {
                      if (clientSearch.length >= 2) setShowClientDropdown(true);
                    }}
                  />
                  {/* Client dropdown */}
                  {showClientDropdown && (clientResults.length > 0 || clientSearching) && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {clientSearching && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          A pesquisar...
                        </p>
                      )}
                      {clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                          onClick={() => selectClient(c)}
                        >
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.phone}
                            {c.email ? ` · ${c.email}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.clientId && (
                    <p className="text-xs text-primary">
                      Selecionado: {selectedClientName}
                    </p>
                  )}
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        isNewClient: true,
                        clientId: "",
                      }))
                    }
                  >
                    + Novo cliente
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Novo cliente
                  </p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline mb-1"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        isNewClient: false,
                        clientName: "",
                        clientPhone: "",
                        clientEmail: "",
                      }))
                    }
                  >
                    Pesquisar existente
                  </button>
                </>
              )}
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            {/* Hora */}
            <div className="space-y-2">
              <Label>Hora *</Label>
              <Input
                type="time"
                step="1800"
                value={form.startTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, status: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* New client inline fields */}
          {form.isNewClient && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-lg border border-dashed">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      clientName: e.target.value,
                    }))
                  }
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telemovel *</Label>
                <Input
                  value={form.clientPhone}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      clientPhone: e.target.value,
                    }))
                  }
                  placeholder="+351 9XX XXX XXX"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      clientEmail: e.target.value,
                    }))
                  }
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Itens do agendamento */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Itens do agendamento</p>

            {/* Search + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pesquisar serviço</Label>
                <Input
                  placeholder="Pesquisar..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={form.groupId}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      groupId: val,
                      serviceId: "",
                      roomId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service + Employee + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Serviço *</Label>
                <Select
                  value={form.serviceId}
                  onValueChange={(val) => {
                    const svc = services.find((s) => s.id === val);
                    setForm((prev) => ({
                      ...prev,
                      serviceId: val,
                      roomId: "",
                      customDuration: svc?.duration || 0,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="truncate">{s.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Profissional *</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, employeeId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Duração (min)</Label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={form.customDuration || selectedService?.duration || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customDuration: parseInt(e.target.value) || 0,
                    }))
                  }
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
            </div>

            {/* Sala */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sala *</Label>
                <Select
                  value={form.roomId}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, roomId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.color }}
                          />
                          {r.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Room note */}
              {selectedService &&
                validRoomIds.length > 0 &&
                form.roomId &&
                !validRoomIds.includes(form.roomId) && (
                  <div className="col-span-1 sm:col-span-2 flex items-end">
                    <p className="text-xs text-amber-600">
                      Esta sala pode não estar configurada para este serviço.
                    </p>
                  </div>
                )}
            </div>

            {/* Summary line */}
            {selectedService && (
              <div className="px-3 py-2 rounded-md bg-muted/50 text-sm">
                <span className="text-muted-foreground">
                  {selectedGroup ? `${selectedGroup.name} > ` : ""}
                </span>
                <span className="font-medium">{selectedService.name}</span>
                <span
                  className="text-muted-foreground"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {" "}
                  · {selectedService.duration}min · {formatEur(selectedService.price)}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Observações + Lembrete */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Observações sobre o agendamento..."
                rows={2}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.sendReminder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sendReminder: e.target.checked }))
                }
                className="rounded border-input"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
              Enviar lembrete via WhatsApp
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
