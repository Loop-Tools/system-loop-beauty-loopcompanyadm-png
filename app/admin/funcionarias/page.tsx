"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

interface Room {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface Service {
  id: string;
  name: string;
  active: boolean;
}

interface ServiceGroup {
  id: string;
  name: string;
  active: boolean;
}

interface Employee {
  id: string;
  name: string;
  photoUrl: string | null;
  active: boolean;
  hasAccount: boolean;
  accountEmail: string | null;
  employeeRooms: { room: Room }[];
  employeeServices: { service: Service }[];
  employeeGroupCommissions: {
    serviceGroup: ServiceGroup;
    commissionRate: number;
  }[];
}

interface GroupCommission {
  serviceGroupId: string;
  commissionRate: number;
}

interface EmployeeForm {
  name: string;
  photoUrl: string;
  roomIds: string[];
  groupCommissions: GroupCommission[];
}

const emptyForm: EmployeeForm = {
  name: "",
  photoUrl: "",
  roomIds: [],
  groupCommissions: [],
};

export default function FuncionariasPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [, setAllServices] = useState<Service[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Account management
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountEmployee, setAccountEmployee] = useState<Employee | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, roomRes, svcRes, grpRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/rooms?active=true"),
        fetch("/api/services?active=true"),
        fetch("/api/service-groups"),
      ]);
      const [empData, roomData, svcData, grpData] = await Promise.all([
        empRes.json(),
        roomRes.json(),
        svcRes.json(),
        grpRes.json(),
      ]);
      setEmployees(empData);
      setRooms(roomData);
      setAllServices(svcData);
      setServiceGroups(
        (grpData || []).filter((g: ServiceGroup) => g.active)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditingEmployee(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      photoUrl: emp.photoUrl || "",
      roomIds: emp.employeeRooms.map((er) => er.room.id),
      groupCommissions: emp.employeeGroupCommissions.map((gc) => ({
        serviceGroupId: gc.serviceGroup.id,
        commissionRate: gc.commissionRate,
      })),
    });
    setDialogOpen(true);
  }

  function toggleRoom(roomId: string) {
    setForm((f) => ({
      ...f,
      roomIds: f.roomIds.includes(roomId)
        ? f.roomIds.filter((id) => id !== roomId)
        : [...f.roomIds, roomId],
    }));
  }

  function toggleGroup(groupId: string) {
    setForm((f) => {
      const exists = f.groupCommissions.find(
        (gc) => gc.serviceGroupId === groupId
      );
      if (exists) {
        return {
          ...f,
          groupCommissions: f.groupCommissions.filter(
            (gc) => gc.serviceGroupId !== groupId
          ),
        };
      }
      return {
        ...f,
        groupCommissions: [
          ...f.groupCommissions,
          { serviceGroupId: groupId, commissionRate: 0 },
        ],
      };
    });
  }

  function updateGroupCommission(groupId: string, rate: number) {
    setForm((f) => ({
      ...f,
      groupCommissions: f.groupCommissions.map((gc) =>
        gc.serviceGroupId === groupId ? { ...gc, commissionRate: rate } : gc
      ),
    }));
  }

  function openAccountDialog(emp: Employee) {
    setAccountEmployee(emp);
    setAccountEmail(emp.accountEmail || "");
    setAccountPassword("");
    setAccountDialogOpen(true);
  }

  async function handleSaveAccount() {
    if (!accountEmployee || !accountEmail || !accountPassword) return;
    setAccountSaving(true);
    try {
      await fetch("/api/employees/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: accountEmployee.id,
          email: accountEmail,
          password: accountPassword,
        }),
      });
      setAccountDialogOpen(false);
      fetchData();
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleDeleteAccount(empId: string) {
    if (!confirm("Tem a certeza que pretende remover o acesso deste colaborador?")) return;
    await fetch(`/api/employees/account?employeeId=${empId}`, { method: "DELETE" });
    fetchData();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "employees");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setForm((f) => ({ ...f, photoUrl: url }));
      }
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        photoUrl: form.photoUrl || null,
        roomIds: form.roomIds,
        groupCommissions: form.groupCommissions,
      };

      if (editingEmployee) {
        await fetch(`/api/employees/${editingEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold">Colaboradores</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Nova Colaboradora</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee
                  ? "Editar Colaboradora"
                  : "Nova Colaboradora"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Nome</Label>
                <Input
                  id="emp-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-3">
                  {form.photoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={form.photoUrl}
                      alt="Foto"
                      className="w-12 h-12 rounded-full object-cover border border-border"
                    />
                  )}
                  <div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? "Enviando..." : form.photoUrl ? "Alterar Foto" : "Enviar Foto"}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Salas que atende</Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {rooms.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma sala ativa cadastrada.
                    </p>
                  ) : (
                    rooms.map((room) => (
                      <label
                        key={room.id}
                        className="flex items-center gap-2 cursor-pointer text-sm p-1.5 rounded hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={form.roomIds.includes(room.id)}
                          onChange={() => toggleRoom(room.id)}
                          className="rounded border-input"
                        />
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: room.color }}
                        />
                        {room.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Categorias e Comissão (%)</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione as categorias que o colaborador atende e defina a comissão.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {serviceGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma categoria cadastrada.
                    </p>
                  ) : (
                    serviceGroups.map((grp) => {
                      const selected = form.groupCommissions.find(
                        (gc) => gc.serviceGroupId === grp.id
                      );
                      return (
                        <div
                          key={grp.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleGroup(grp.id)}
                            className="rounded border-input"
                          />
                          <span className="flex-1 text-sm font-medium">
                            {grp.name}
                          </span>
                          {selected && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={selected.commissionRate}
                                onChange={(e) =>
                                  updateGroupCommission(
                                    grp.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 h-8 text-sm text-right"
                              />
                              <span className="text-sm text-muted-foreground">
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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
          <CardTitle className="text-lg">Colaboradores cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhuma colaboradora cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-muted/50 border border-border/50 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <p className="font-medium text-sm">{emp.name}</p>
                      <Badge
                        className={
                          emp.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                        variant="secondary"
                      >
                        {emp.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>

                    {emp.employeeGroupCommissions.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs text-muted-foreground font-medium">
                          Comissões por categoria:
                        </p>
                        {emp.employeeGroupCommissions.map((gc) => (
                          <div
                            key={gc.serviceGroup.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground ml-2"
                          >
                            <span>{gc.serviceGroup.name}</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700"
                            >
                              {gc.commissionRate}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {emp.employeeRooms.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium">
                          Salas:
                        </span>
                        {emp.employeeRooms.map((er) => (
                          <span
                            key={er.room.id}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: er.room.color }}
                            />
                            {er.room.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      {emp.hasAccount ? (
                        <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">
                          {emp.accountEmail}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAccountDialog(emp)}
                      >
                        {emp.hasAccount ? "Alterar Acesso" : "Criar Acesso"}
                      </Button>
                      {emp.hasAccount && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteAccount(emp.id)}
                        >
                          Remover Acesso
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(emp)}
                      >
                        Editar
                      </Button>
                      {emp.active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(emp)}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {accountEmployee?.hasAccount ? "Alterar Acesso" : "Criar Acesso"} — {accountEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {accountEmployee?.hasAccount
                ? "Altere o email ou a senha de acesso ao sistema."
                : "Crie um acesso para que este colaborador possa entrar no sistema."}
            </p>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder="email@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{accountEmployee?.hasAccount ? "Nova Senha *" : "Senha *"}</Label>
              <Input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveAccount}
                disabled={accountSaving || !accountEmail || accountPassword.length < 6}
              >
                {accountSaving ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
