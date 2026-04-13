"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface Room {
  id: string;
  name: string;
  description: string | null;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoomForm {
  name: string;
  description: string;
  color: string;
  active: boolean;
}

const emptyForm: RoomForm = {
  name: "",
  description: "",
  color: "#E8B4B8",
  active: true,
};

export default function SalasPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  function openCreate() {
    setEditingRoom(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(room: Room) {
    setEditingRoom(room);
    setForm({
      name: room.name,
      description: room.description || "",
      color: room.color,
      active: room.active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingRoom) {
        await fetch(`/api/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description || null,
            color: form.color,
          }),
        });
      }
      setDialogOpen(false);
      fetchRooms();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(room: Room) {
    await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    fetchRooms();
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold">Salas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Nova Sala</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? "Editar Sala" : "Nova Sala"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="room-name">Nome</Label>
                <Input
                  id="room-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ex: Sala 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-description">Descrição</Label>
                <Input
                  id="room-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Descrição da sala"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-color">Cor</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="room-color"
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="w-28"
                    placeholder="#E8B4B8"
                  />
                </div>
              </div>
              {editingRoom && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="room-active">Ativa</Label>
                  <Switch
                    id="room-active"
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, active: !!checked }))
                    }
                  />
                </div>
              )}
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || !form.name}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Salas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhuma sala cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 border border-border"
                      style={{ backgroundColor: room.color }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {room.name}
                      </p>
                      {room.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {room.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge
                      className={
                        room.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                      variant="secondary"
                    >
                      {room.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(room)}
                    >
                      Editar
                    </Button>
                    {room.active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeactivate(room)}
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
      </Card>
    </div>
  );
}
