"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ClinicSettings {
  id: string;
  clinicName: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  slotInterval: number;
  whatsappTemplate: string;
}

interface BusinessHour {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

const dayNames = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const defaultBusinessHours: BusinessHour[] = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "18:00", isOpen: false },
  { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
  { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", isOpen: true },
];

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<ClinicSettings>({
    id: "singleton",
    clinicName: "",
    phone: "",
    address: "",
    logoUrl: null,
    slotInterval: 30,
    whatsappTemplate: "",
  });
  const [businessHours, setBusinessHours] =
    useState<BusinessHour[]>(defaultBusinessHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
      if (data.businessHours && data.businessHours.length > 0) {
        // Merge with defaults to ensure all days exist
        const merged = defaultBusinessHours.map((def) => {
          const existing = data.businessHours.find(
            (bh: BusinessHour) => bh.dayOfWeek === def.dayOfWeek
          );
          return existing || def;
        });
        setBusinessHours(merged);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            clinicName: settings.clinicName,
            phone: settings.phone,
            address: settings.address,
            slotInterval: settings.slotInterval,
            whatsappTemplate: settings.whatsappTemplate,
          },
          businessHours: businessHours.map((bh) => ({
            dayOfWeek: bh.dayOfWeek,
            openTime: bh.openTime,
            closeTime: bh.closeTime,
            isOpen: bh.isOpen,
          })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function updateHour(
    dayOfWeek: number,
    field: keyof BusinessHour,
    value: string | boolean
  ) {
    setBusinessHours((hours) =>
      hours.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold">Configurações</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              Salvo com sucesso!
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Clinic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinic-name">Nome da Clínica</Label>
              <Input
                id="clinic-name"
                value={settings.clinicName}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, clinicName: e.target.value }))
                }
                placeholder="Nome da clinica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-phone">Telefone</Label>
              <Input
                id="clinic-phone"
                value={settings.phone}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, phone: e.target.value }))
                }
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinic-address">Endereço</Label>
            <Input
              id="clinic-address"
              value={settings.address}
              onChange={(e) =>
                setSettings((s) => ({ ...s, address: e.target.value }))
              }
              placeholder="Rua, número, bairro, cidade"
            />
          </div>
        </CardContent>
      </Card>

      {/* Slot Interval */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Intervalo de Horários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="slot-interval">Intervalo entre horários</Label>
            <select
              id="slot-interval"
              value={settings.slotInterval}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  slotInterval: parseInt(e.target.value),
                }))
              }
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-template">Mensagem de confirmação</Label>
            <Textarea
              id="whatsapp-template"
              value={settings.whatsappTemplate}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  whatsappTemplate: e.target.value,
                }))
              }
              rows={4}
              placeholder="Olá {nome}! Seu agendamento..."
            />
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium">Tokens disponíveis:</p>
            <p>
              <code className="bg-muted px-1 py-0.5 rounded">{"{nome}"}</code>{" "}
              - Nome do cliente
            </p>
            <p>
              <code className="bg-muted px-1 py-0.5 rounded">
                {"{clinica}"}
              </code>{" "}
              - Nome da clinica
            </p>
            <p>
              <code className="bg-muted px-1 py-0.5 rounded">{"{data}"}</code>{" "}
              - Data do agendamento
            </p>
            <p>
              <code className="bg-muted px-1 py-0.5 rounded">
                {"{horario}"}
              </code>{" "}
              - Horário do agendamento
            </p>
            <p>
              <code className="bg-muted px-1 py-0.5 rounded">
                {"{servico}"}
              </code>{" "}
              - Nome do serviço
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {businessHours.map((bh) => (
              <div
                key={bh.dayOfWeek}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center justify-between sm:w-44 shrink-0">
                  <span className="text-sm font-medium">
                    {dayNames[bh.dayOfWeek]}
                  </span>
                  <Switch
                    checked={bh.isOpen}
                    onCheckedChange={(checked) =>
                      updateHour(bh.dayOfWeek, "isOpen", !!checked)
                    }
                  />
                </div>
                {bh.isOpen && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={bh.openTime}
                      onChange={(e) =>
                        updateHour(bh.dayOfWeek, "openTime", e.target.value)
                      }
                      className="w-28"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                    <span className="text-sm text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={bh.closeTime}
                      onChange={(e) =>
                        updateHour(bh.dayOfWeek, "closeTime", e.target.value)
                      }
                      className="w-28"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                )}
                {!bh.isOpen && (
                  <span className="text-sm text-muted-foreground">
                    Fechado
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
