"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string | null;
  createdAt: string;
}

interface EmployeeData {
  id: string;
  name: string;
  employeeServices: {
    service: {
      name: string;
      group: { name: string } | null;
    };
  }[];
  employeeRooms: {
    room: { name: string };
  }[];
}

export default function PerfilPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setEmployee(data.employee);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Erro ao alterar senha");
        return;
      }

      setPasswordSuccess("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Extract unique categories from employee services
  const categories: string[] = [];
  if (employee) {
    const names = employee.employeeServices
      .map((es: { service: { name: string; group: { name: string } | null } }) => es.service.group?.name)
      .filter((n: string | undefined): n is string => !!n);
    for (const n of names) {
      if (!categories.includes(n)) categories.push(n);
    }
  }

  const rooms = employee
    ? employee.employeeRooms.map((er) => er.room.name)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerir as suas informações pessoais e senha
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Utilizador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="space-y-3 min-w-0">
              <div>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                  {user?.role === "admin" ? "Administrador" : "Colaborador"}
                </Badge>
              </div>
              {user?.createdAt && (
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Membro desde {formatDate(user.createdAt)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Info Card */}
      {employee && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Colaborador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <p className="text-sm font-medium">{employee.name}</p>
            </div>

            {categories.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Categorias</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {categories.map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {rooms.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Salas</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {rooms.map((room) => (
                    <Badge key={room} variant="outline" className="text-xs">
                      {room}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">{passwordSuccess}</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "A guardar..." : "Guardar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
