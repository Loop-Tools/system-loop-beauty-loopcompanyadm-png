"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnamnesisField {
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
}

interface AnamnesisTemplate {
  id: string;
  name: string;
  fields: string;
  active: boolean;
  createdAt: string;
  _count?: { clientAnamneses: number };
}

export default function AnamnisePage() {
  const [templates, setTemplates] = useState<AnamnesisTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnamnesisTemplate | null>(null);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<AnamnesisField[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/anamnesis-templates");
      const data = await res.json();
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function openCreate() {
    setEditing(null);
    setName("");
    setFields([{ label: "", type: "text", required: false }]);
    setDialogOpen(true);
  }

  function openEdit(tmpl: AnamnesisTemplate) {
    setEditing(tmpl);
    setName(tmpl.name);
    try {
      setFields(JSON.parse(tmpl.fields));
    } catch {
      setFields([]);
    }
    setDialogOpen(true);
  }

  function addField() {
    setFields([...fields, { label: "", type: "text", required: false }]);
  }

  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, updates: Partial<AnamnesisField>) {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  }

  async function handleSave() {
    if (!name || fields.length === 0) return;
    setSaving(true);
    try {
      const validFields = fields.filter((f) => f.label.trim());
      const payload = { name, fields: JSON.stringify(validFields) };

      if (editing) {
        await fetch("/api/anamnesis-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
      } else {
        await fetch("/api/anamnesis-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(tmpl: AnamnesisTemplate) {
    await fetch("/api/anamnesis-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tmpl.id }),
    });
    fetchTemplates();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold">Anamnese</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie e gerencie modelos de anamnese
          </p>
        </div>
        <Button onClick={openCreate}>+ Novo Modelo</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum modelo de anamnese cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => {
            let parsedFields: AnamnesisField[] = [];
            try {
              parsedFields = JSON.parse(tmpl.fields);
            } catch {}

            return (
              <Card key={tmpl.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{tmpl.name}</h3>
                        <Badge
                          className={
                            tmpl.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                          variant="secondary"
                        >
                          {tmpl.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {parsedFields.length} campo{parsedFields.length !== 1 ? "s" : ""}
                        {" · "}
                        Criado em{" "}
                        {new Date(tmpl.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {parsedFields.slice(0, 5).map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {f.label}
                          </Badge>
                        ))}
                        {parsedFields.length > 5 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{parsedFields.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(tmpl)}>
                        Editar
                      </Button>
                      {tmpl.active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(tmpl)}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Modelo" : "Novo Modelo de Anamnese"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome do Modelo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Anamnese Facial, Anamnese Corporal..."
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Campos da Anamnese</Label>
                <Button variant="outline" size="sm" onClick={addField}>
                  + Campo
                </Button>
              </div>

              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(idx, { label: e.target.value })
                        }
                        placeholder="Pergunta ou campo..."
                      />
                      <div className="flex items-center gap-3">
                        <select
                          className="border border-input rounded-md px-2 py-1 text-sm bg-background"
                          value={field.type}
                          onChange={(e) =>
                            updateField(idx, {
                              type: e.target.value as AnamnesisField["type"],
                            })
                          }
                        >
                          <option value="text">Texto curto</option>
                          <option value="textarea">Texto longo</option>
                          <option value="select">Seleção</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(idx, { required: e.target.checked })
                            }
                          />
                          Obrigatório
                        </label>
                      </div>
                      {field.type === "select" && (
                        <Input
                          value={(field.options || []).join(", ")}
                          onChange={(e) =>
                            updateField(idx, {
                              options: e.target.value
                                .split(",")
                                .map((o) => o.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Opções separadas por vírgula: Sim, Não, Talvez"
                          className="text-sm"
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive shrink-0 mt-1"
                      onClick={() => removeField(idx)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Adicione campos ao modelo de anamnese.
                </p>
              )}
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name || fields.length === 0}
              >
                {saving ? "Salvando..." : "Salvar Modelo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
