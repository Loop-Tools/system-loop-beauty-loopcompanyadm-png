"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  nif: string | null;
  birthday: string | null;
  referredBy: string | null;
  notes: string | null;
  _count: { appointments: number };
}

interface ClientForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  nif: string;
  birthday: string;
  referredBy: string;
  notes: string;
}

const emptyForm: ClientForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  nif: "",
  birthday: "",
  referredBy: "",
  notes: "",
};

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/clients${params}`);
      const data = await res.json();
      setClients(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients("");
  }, [fetchClients]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => fetchClients(value), 400);
    setSearchTimeout(timeout);
  }

  async function handleCreateClient() {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          nif: form.nif || null,
          birthday: form.birthday || null,
          referredBy: form.referredBy || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        fetchClients(search);
      }
    } finally {
      setSaving(false);
    }
  }



  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cadastro e gestão de clientes
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          + Novo Cliente
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Clientes{" "}
            <span className="text-muted-foreground font-normal" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              ({clients.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => router.push(`/admin/clientes/${client.id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/80 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{client.phone}</span>
                          {client.email && (
                            <span className="text-xs text-muted-foreground truncate">{client.email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <Badge variant="secondary" className="text-xs">
                      {client._count.appointments} agendamento{client._count.appointments !== 1 ? "s" : ""}
                    </Badge>
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

      {/* New Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+351 9XX XXX XXX" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Morada</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço completo" />
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} placeholder="Número de Identificação Fiscal" />
              </div>
              <div className="space-y-2">
                <Label>Aniversário</Label>
                <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Indicado por</Label>
                <Input value={form.referredBy} onChange={(e) => setForm({ ...form, referredBy: e.target.value })} placeholder="Nome de quem indicou" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações gerais..." rows={2} />
              </div>
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClient} disabled={saving || !form.name || !form.phone}>
                {saving ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
