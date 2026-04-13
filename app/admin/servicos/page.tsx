"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// ── Types ──────────────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  groupId: string | null;
  roomServices?: { room: { id: string; name: string } }[];
}

interface ServiceGroup {
  id: string;
  name: string;
  order: number;
  active: boolean;
  services: ServiceItem[];
}

interface RoomOption {
  id: string;
  name: string;
  color: string;
}

interface ServiceForm {
  name: string;
  duration: number;
  price: number;
  groupId: string;
  roomIds: string[];
}

interface GroupForm {
  name: string;
}

// ── Constants ──────────────────────────────────────────────────────

const emptyServiceForm: ServiceForm = {
  name: "",
  duration: 30,
  price: 0,
  groupId: "",
  roomIds: [],
};

const emptyGroupForm: GroupForm = { name: "" };

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// ── Chevron icon (inline to avoid extra dependency) ────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────

export default function ServicosPage() {
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [allRooms, setAllRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [savingGroup, setSavingGroup] = useState(false);

  // Service dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [savingService, setSavingService] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, roomRes] = await Promise.all([
        fetch("/api/service-groups"),
        fetch("/api/rooms?active=true"),
      ]);
      const data: ServiceGroup[] = await res.json();
      setGroups(data);
      setAllRooms(await roomRes.json());
      // Expand all groups by default on first load
      setExpandedGroups((prev) => {
        if (prev.size === 0) {
          return new Set(data.map((g) => g.id));
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Group helpers ──────────────────────────────────────────────

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupForm(emptyGroupForm);
    setGroupDialogOpen(true);
  }

  function openEditGroup(group: ServiceGroup) {
    setEditingGroup(group);
    setGroupForm({ name: group.name });
    setGroupDialogOpen(true);
  }

  async function handleSaveGroup() {
    setSavingGroup(true);
    try {
      if (editingGroup) {
        await fetch("/api/service-groups", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingGroup.id, name: groupForm.name }),
        });
      } else {
        await fetch("/api/service-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupForm.name }),
        });
      }
      setGroupDialogOpen(false);
      fetchData();
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeactivateGroup(group: ServiceGroup) {
    await fetch("/api/service-groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: group.id }),
    });
    fetchData();
  }

  // ── Service helpers ────────────────────────────────────────────

  function openCreateService(groupId: string) {
    setEditingService(null);
    setServiceForm({ ...emptyServiceForm, groupId });
    setServiceDialogOpen(true);
  }

  function openEditService(svc: ServiceItem) {
    setEditingService(svc);
    setServiceForm({
      name: svc.name,
      duration: svc.duration,
      price: svc.price,
      groupId: svc.groupId || "",
      roomIds: svc.roomServices?.map((rs) => rs.room.id) || [],
    });
    setServiceDialogOpen(true);
  }

  async function handleSaveService() {
    setSavingService(true);
    try {
      const payload = {
        name: serviceForm.name,
        duration: serviceForm.duration,
        price: serviceForm.price,
        groupId: serviceForm.groupId || null,
        roomIds: serviceForm.roomIds,
      };

      if (editingService) {
        await fetch(`/api/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setServiceDialogOpen(false);
      fetchData();
    } finally {
      setSavingService(false);
    }
  }

  async function handleDeactivateService(svc: ServiceItem) {
    await fetch(`/api/services/${svc.id}`, { method: "DELETE" });
    fetchData();
  }

  // ── Loading skeleton ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold">Serviços</h1>
        <Button onClick={openCreateGroup}>+ Nova Categoria</Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Pesquisar serviços..."
          value={serviceSearchQuery}
          onChange={(e) => setServiceSearchQuery(e.target.value)}
        />
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-sm text-center">
              Nenhuma categoria de serviços cadastrada ainda. Crie uma categoria para começar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {groups.filter((group) => {
        if (!serviceSearchQuery) return true;
        const q = serviceSearchQuery.toLowerCase();
        if (group.name.toLowerCase().includes(q)) return true;
        return group.services.some((s) => s.name.toLowerCase().includes(q));
      }).map((group) => {
        const isExpanded = expandedGroups.has(group.id);
        return (
          <Card
            key={group.id}
            className="overflow-hidden border-l-4 border-l-primary/40"
          >
            {/* Group header */}
            <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
              <button
                type="button"
                className="flex items-center gap-2 text-left flex-1 min-w-0"
                onClick={() => toggleGroup(group.id)}
              >
                <ChevronIcon open={isExpanded} />
                <span className="font-semibold text-base truncate">
                  {group.name}
                </span>
                <Badge variant="outline" className="ml-1 shrink-0">
                  {group.services.length}{" "}
                  {group.services.length === 1 ? "serviço" : "serviços"}
                </Badge>
              </button>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditGroup(group)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeactivateGroup(group)}
                >
                  Desativar
                </Button>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <CardContent className="pt-4 pb-5 space-y-3">
                {/* Add service button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCreateService(group.id)}
                >
                  + Novo Serviço
                </Button>

                {group.services.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Nenhum serviço nesta categoria.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.services.map((svc) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{svc.name}</p>
                            <Badge
                              className={
                                svc.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }
                              variant="secondary"
                            >
                              {svc.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span
                              className="text-sm text-muted-foreground"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {svc.duration} min
                            </span>
                            <span
                              className="text-sm font-medium"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {formatPrice(svc.price)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditService(svc)}
                          >
                            Editar
                          </Button>
                          {svc.active && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeactivateService(svc)}
                            >
                              Desativar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* ── Group Dialog ─────────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nome</Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex: Tratamentos Faciais"
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setGroupDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveGroup}
                disabled={savingGroup || !groupForm.name.trim()}
              >
                {savingGroup ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Service Dialog ───────────────────────────────────────── */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nome</Label>
              <Input
                id="svc-name"
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex: Limpeza de pele"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-duration">Duração (min)</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={serviceForm.duration}
                  onChange={(e) =>
                    setServiceForm((f) => ({
                      ...f,
                      duration: parseInt(e.target.value) || 0,
                    }))
                  }
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-price">Preço (€)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={serviceForm.price}
                  onChange={(e) =>
                    setServiceForm((f) => ({
                      ...f,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-group">Categoria</Label>
              <select
                id="svc-group"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={serviceForm.groupId}
                onChange={(e) =>
                  setServiceForm((f) => ({ ...f, groupId: e.target.value }))
                }
              >
                <option value="">Sem categoria</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Salas</Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {allRooms.map((room) => (
                  <label
                    key={room.id}
                    className="flex items-center gap-2 cursor-pointer text-sm p-1.5 rounded hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={serviceForm.roomIds.includes(room.id)}
                      onChange={() =>
                        setServiceForm((f) => ({
                          ...f,
                          roomIds: f.roomIds.includes(room.id)
                            ? f.roomIds.filter((id) => id !== room.id)
                            : [...f.roomIds, room.id],
                        }))
                      }
                      className="rounded border-input"
                    />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: room.color }}
                    />
                    {room.name}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setServiceDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveService}
                disabled={savingService || !serviceForm.name.trim()}
              >
                {savingService ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
