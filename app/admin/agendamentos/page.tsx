"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  price: number | null;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string; duration: number; price: number };
  employee: { id: string; name: string };
  room: { id: string; name: string; color: string };
}

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-PT");
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [newAptOpen, setNewAptOpen] = useState(false);

  // Detail dialog
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [aptNotes, setAptNotes] = useState("");
  const [aptSaving, setAptSaving] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, search]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  function openDetail(apt: Appointment) {
    setSelectedApt(apt);
    setAptNotes(apt.notes || "");
    setDetailOpen(true);
  }

  async function handleUpdateStatus(status: string) {
    if (!selectedApt) return;
    setAptSaving(true);
    try {
      await fetch(`/api/appointments/${selectedApt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: aptNotes }),
      });
      setDetailOpen(false);
      fetchAppointments();
    } finally {
      setAptSaving(false);
    }
  }

  async function handleSaveNotes() {
    if (!selectedApt) return;
    setAptSaving(true);
    try {
      await fetch(`/api/appointments/${selectedApt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: aptNotes }),
      });
      setDetailOpen(false);
      fetchAppointments();
    } finally {
      setAptSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold">Agendamentos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie os agendamentos da clínica
          </p>
        </div>
        <Button onClick={() => setNewAptOpen(true)}>+ Novo Agendamento</Button>
      </div>

      <NewAppointmentDialog
        open={newAptOpen}
        onOpenChange={setNewAptOpen}
        onCreated={fetchAppointments}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-date" className="text-xs">Data</Label>
              <Input
                id="filter-date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs">Status</Label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Todos</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[180px]">
              <Label htmlFor="filter-search" className="text-xs">Buscar</Label>
              <Input
                id="filter-search"
                placeholder="Nome, telefone ou e-mail do cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDateFilter(""); setStatusFilter(""); setSearch(""); }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Resultados{" "}
            <span className="text-muted-foreground font-normal" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              ({appointments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhum agendamento encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <button
                  key={apt.id}
                  type="button"
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50 gap-3 text-left hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => openDetail(apt)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{apt.client.name}</p>
                      <Badge className={statusColors[apt.status] || ""} variant="secondary">
                        {statusLabels[apt.status] || apt.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {formatDate(apt.date)}
                      </span>
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {apt.startTime} - {apt.endTime}
                      </span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="text-xs text-muted-foreground">{apt.service.name}</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="text-xs text-muted-foreground">{apt.employee.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: apt.room.color }} />
                        {apt.room.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
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
                    <p className="text-sm text-muted-foreground">{selectedApt.client.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      className={statusColors[selectedApt.status] || ""}
                      variant="secondary"
                    >
                      {statusLabels[selectedApt.status] || selectedApt.status}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Procedimento</p>
                    <p className="font-medium">{selectedApt.service.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="font-medium">{selectedApt.employee.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data / Horário</p>
                    <p className="font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {formatDate(selectedApt.date)} · {selectedApt.startTime} - {selectedApt.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sala</p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedApt.room.color }} />
                      <p className="font-medium">{selectedApt.room.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {formatEur(selectedApt.price ?? selectedApt.service.price)}
                    </p>
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
                    onClick={() => window.open(`/admin/clientes/${selectedApt.client.id}`, "_blank")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Ver Cliente
                  </Button>

                  {aptNotes !== (selectedApt.notes || "") && (
                    <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={aptSaving}>
                      Salvar Notas
                    </Button>
                  )}

                  <div className="flex-1" />

                  {selectedApt.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateStatus("completed")}
                        disabled={aptSaving}
                      >
                        Concluir
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus("cancelled")}
                        disabled={aptSaving}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (!selectedApt || !confirm("Tem a certeza que pretende excluir este agendamento permanentemente?")) return;
                      setAptSaving(true);
                      await fetch(`/api/appointments/${selectedApt.id}?permanent=true`, { method: "DELETE" });
                      setDetailOpen(false);
                      fetchAppointments();
                      setAptSaving(false);
                    }}
                    disabled={aptSaving}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
