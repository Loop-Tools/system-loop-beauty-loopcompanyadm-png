"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Types ---

interface ClientData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  nif: string | null;
  birthday: string | null;
  referredBy: string | null;
  notes: string | null;
  credit: number;
  cashback: number;
  daysSinceLastVisit: number | null;
  lastServiceName: string | null;
  totalSpent: number;
  clientSince: string;
  cancellationRate: number;
  lastAppointments: Appointment[];
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string };
  employee: { name: string };
  room: { name: string; color: string };
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface ClientFile {
  id: string;
  url: string;
  filename: string;
  type: string;
  takenAt: string | null;
  createdAt: string;
}

interface AnamnesisTemplate {
  id: string;
  name: string;
  fields: string;
}

interface TemplateField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
}

interface Anamnesis {
  id: string;
  templateName: string;
  createdAt: string;
  answers: Record<string, string>;
}

// --- Helpers ---

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Concluido",
  cancelled: "Cancelado",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-PT");
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function isImageFile(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
}

// --- Component ---

export default function ClientProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form (now inline in Dados Pessoais tab)
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nif: "",
    birthday: "",
    referredBy: "",
    notes: "",
    credit: 0,
    cashback: 0,
  });
  const [saving, setSaving] = useState(false);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Files
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Image viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastTouchDist = useRef(0);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);

  // Anamneses
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [expandedAnamnesis, setExpandedAnamnesis] = useState<string | null>(null);
  const [anamnesisDialogOpen, setAnamnesisDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<AnamnesisTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AnamnesisTemplate | null>(null);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, string>>({});
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);

  // --- Data fetching ---

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setClient(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}/notes`);
    if (res.ok) setNotes(await res.json());
  }, [id]);

  const fetchFiles = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}/files`);
    if (res.ok) setFiles(await res.json());
  }, [id]);

  const fetchAnamneses = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}/anamneses`);
    if (res.ok) setAnamneses(await res.json());
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchNotes();
    fetchFiles();
    fetchAnamneses();
  }, [fetchClient, fetchNotes, fetchFiles, fetchAnamneses]);

  // Populate edit form when client loads
  useEffect(() => {
    if (client) {
      setEditForm({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        nif: client.nif || "",
        birthday: client.birthday ? client.birthday.slice(0, 10) : "",
        referredBy: client.referredBy || "",
        notes: client.notes || "",
        credit: client.credit || 0,
        cashback: client.cashback || 0,
      });
    }
  }, [client]);

  // --- Handlers ---

  async function handleSaveClient() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        fetchClient();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/clients/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      if (res.ok) {
        setNewNote("");
        fetchNotes();
      }
    } finally {
      setSavingNote(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`/api/clients/${id}/files`, { method: "POST", body: formData });
      fetchFiles();
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (deletingFileId) return;
    setDeletingFileId(fileId);
    try {
      const res = await fetch(`/api/clients/${id}/files?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFiles();
      }
    } finally {
      setDeletingFileId(null);
    }
  }

  const startCamera = async () => {
    setCameraOpen(true);
    setCapturedImage(null);
    setCapturedBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      // Wait for next tick so the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const now = new Date();
    const dateStr = now.toLocaleString("pt-PT");
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, canvasRef.current.height - 40, canvasRef.current.width, 40);
    ctx.fillStyle = "white";
    ctx.font = "16px DM Sans, sans-serif";
    ctx.fillText(dateStr, 10, canvasRef.current.height - 15);

    setCapturedAt(now);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) setCapturedBlob(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  const confirmPhoto = async () => {
    if (!capturedBlob || !capturedAt) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", capturedBlob, `foto-${Date.now()}.jpg`);
      formData.append("takenAt", capturedAt.toISOString());
      await fetch(`/api/clients/${id}/files`, { method: "POST", body: formData });
      fetchFiles();
    } finally {
      setUploadingFile(false);
      stopCamera();
    }
  };

  function openImageViewer(url: string) {
    setViewerUrl(url);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setViewerOpen(true);
  }

  function closeImageViewer(open: boolean) {
    if (!open) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
    setViewerOpen(open);
  }

  // Pinch-to-zoom touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      isPanning.current = true;
      lastPanPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDist.current > 0) {
        const scale = dist / lastTouchDist.current;
        setZoomLevel((z) => Math.min(5, Math.max(0.5, z * scale)));
      }
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - lastPanPos.current.x;
      const dy = e.touches[0].clientY - lastPanPos.current.y;
      setPanOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastPanPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = 0;
    isPanning.current = false;
  };

  async function openAnamnesisDialog() {
    setAnamnesisDialogOpen(true);
    setSelectedTemplate(null);
    setAnamnesisAnswers({});
    const res = await fetch("/api/anamnesis-templates");
    if (res.ok) setTemplates(await res.json());
  }

  async function handleSaveAnamnesis() {
    if (!selectedTemplate) return;
    setSavingAnamnesis(true);
    try {
      const res = await fetch(`/api/clients/${id}/anamneses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          answers: anamnesisAnswers,
        }),
      });
      if (res.ok) {
        setAnamnesisDialogOpen(false);
        fetchAnamneses();
      }
    } finally {
      setSavingAnamnesis(false);
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6 animate-fade-in">
        <p className="text-muted-foreground">Cliente nao encontrado.</p>
        <Link href="/admin/clientes">
          <Button variant="outline" size="sm">
            &larr; Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const templateFields: TemplateField[] = selectedTemplate
    ? JSON.parse(selectedTemplate.fields)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/clientes">
          <Button variant="outline" size="sm">
            &larr; Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">{client.phone}</span>
            {client.email && (
              <span className="text-sm text-muted-foreground">{client.email}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Dias sem visita</p>
            <p
              className={`text-lg font-semibold mt-1 ${
                client.daysSinceLastVisit !== null && client.daysSinceLastVisit > 60
                  ? "text-red-600"
                  : ""
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {client.daysSinceLastVisit ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ultimo servico</p>
            <p className="text-sm font-medium mt-1 truncate">
              {client.lastServiceName || "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Faturamento total</p>
            <p
              className="text-lg font-semibold mt-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatCurrency(client.totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tempo como cliente</p>
            <p className="text-sm font-medium mt-1">{client.clientSince}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxa de cancelamento</p>
            <p
              className="text-lg font-semibold mt-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {client.cancellationRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Credito</p>
            <p
              className="text-lg font-semibold mt-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatCurrency(client.credit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cashback</p>
            <p
              className="text-lg font-semibold mt-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatCurrency(client.cashback)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="anotacoes">Anotacoes</TabsTrigger>
          <TabsTrigger value="arquivos">Imagens e Arquivos</TabsTrigger>
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
        </TabsList>

        {/* Tab: Dados Pessoais */}
        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Telefone (+351)</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+351 ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Morada</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>NIF</Label>
                    <Input
                      value={editForm.nif}
                      onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aniversario</Label>
                    <Input
                      type="date"
                      value={editForm.birthday}
                      onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Indicado por</Label>
                  <Input
                    value={editForm.referredBy}
                    onChange={(e) => setEditForm({ ...editForm, referredBy: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observacoes</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Credito (EUR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.credit}
                      onChange={(e) =>
                        setEditForm({ ...editForm, credit: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cashback (EUR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.cashback}
                      onChange={(e) =>
                        setEditForm({ ...editForm, cashback: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveClient} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Agendamentos */}
        <TabsContent value="agendamentos">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {client.lastAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum agendamento encontrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {client.lastAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {formatDate(apt.date)}
                          </span>
                          <span className="text-muted-foreground">|</span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {apt.startTime} - {apt.endTime}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-0.5">{apt.service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {apt.employee.name} &middot; {apt.room.name}
                        </p>
                      </div>
                      <Badge
                        className={statusColors[apt.status] || ""}
                        variant="secondary"
                      >
                        {statusLabels[apt.status] || apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Anotacoes */}
        <TabsContent value="anotacoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anotacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Escreva uma nova anotacao..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleSaveNote}
                  disabled={savingNote || !newNote.trim()}
                  size="sm"
                >
                  {savingNote ? "Salvando..." : "Nova anotacao"}
                </Button>
              </div>

              <Separator />

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma anotacao ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p
                        className="text-xs text-muted-foreground mt-2"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {formatDateTime(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Imagens e Arquivos */}
        <TabsContent value="arquivos">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Imagens e Arquivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload section */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={startCamera}>
                  Tirar Foto
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? "Enviando..." : "Anexar Arquivo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Camera */}
              {cameraOpen && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                  {!capturedImage ? (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full max-w-md rounded-lg"
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={capturePhoto}>
                          Capturar
                        </Button>
                        <Button variant="outline" size="sm" onClick={stopCamera}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={capturedImage}
                        alt="Preview"
                        className="w-full max-w-md rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={confirmPhoto} disabled={uploadingFile}>
                          {uploadingFile ? "Enviando..." : "Confirmar e Enviar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCapturedImage(null);
                            setCapturedBlob(null);
                          }}
                        >
                          Tirar novamente
                        </Button>
                        <Button variant="outline" size="sm" onClick={stopCamera}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              <Separator />

              {/* Files grid */}
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum arquivo enviado.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {files.map((file) =>
                    isImageFile(file.filename) ? (
                      <div
                        key={file.id}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/30 hover:ring-2 hover:ring-primary/50 transition-all"
                      >
                        <button
                          type="button"
                          className="w-full h-full"
                          onClick={() => openImageViewer(file.url)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={file.url}
                            alt={file.filename}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                            <p
                              className="text-[10px] text-white truncate"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {file.takenAt
                                ? formatDateTime(file.takenAt)
                                : formatDateTime(file.createdAt)}
                            </p>
                          </div>
                        </button>
                        <button
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          disabled={deletingFileId === file.id}
                        >
                          {deletingFileId === file.id ? "..." : "\u00d7"}
                        </button>
                      </div>
                    ) : (
                      <div
                        key={file.id}
                        className="relative group flex flex-col items-center justify-center aspect-square rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors p-3"
                      >
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center flex-1 w-full"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-muted-foreground mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-xs text-muted-foreground text-center truncate w-full">
                            {file.filename}
                          </p>
                        </a>
                        <button
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          disabled={deletingFileId === file.id}
                        >
                          {deletingFileId === file.id ? "..." : "\u00d7"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image viewer dialog */}
          <Dialog open={viewerOpen} onOpenChange={closeImageViewer}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Visualizar Imagem</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                >
                  -
                </Button>
                <span
                  className="flex items-center text-sm text-muted-foreground px-2"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.min(5, z + 0.25))}
                >
                  +
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                >
                  Reset
                </Button>
              </div>
              <div
                className="overflow-hidden max-h-[70vh] flex items-center justify-center touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewerUrl}
                  alt="Imagem"
                  className="transition-transform duration-100 max-w-full"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab: Anamnese */}
        <TabsContent value="anamnese">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Anamnese</CardTitle>
              <Button size="sm" onClick={openAnamnesisDialog}>
                Nova Anamnese
              </Button>
            </CardHeader>
            <CardContent>
              {anamneses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma anamnese preenchida.
                </p>
              ) : (
                <div className="space-y-2">
                  {anamneses.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-border/50 overflow-hidden"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
                        onClick={() =>
                          setExpandedAnamnesis((prev) => (prev === a.id ? null : a.id))
                        }
                      >
                        <div>
                          <p className="text-sm font-medium">{a.templateName}</p>
                          <p
                            className="text-xs text-muted-foreground"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {formatDateTime(a.createdAt)}
                          </p>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            expandedAnamnesis === a.id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {expandedAnamnesis === a.id && (
                        <div className="border-t border-border/50 bg-background p-4 space-y-2">
                          {Object.entries(a.answers).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-xs text-muted-foreground">{key}</p>
                              <p className="text-sm">{value || "-"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Anamnesis Dialog */}
          <Dialog open={anamnesisDialogOpen} onOpenChange={setAnamnesisDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Anamnese</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedTemplate?.id || ""}
                    onChange={(e) => {
                      const tpl = templates.find((t) => t.id === e.target.value) || null;
                      setSelectedTemplate(tpl);
                      setAnamnesisAnswers({});
                    }}
                  >
                    <option value="">Selecione um modelo...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && templateFields.length > 0 && (
                  <>
                    <Separator />
                    {templateFields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label>{field.label}</Label>
                        {field.type === "text" && (
                          <Input
                            value={anamnesisAnswers[field.label] || ""}
                            onChange={(e) =>
                              setAnamnesisAnswers({
                                ...anamnesisAnswers,
                                [field.label]: e.target.value,
                              })
                            }
                          />
                        )}
                        {field.type === "textarea" && (
                          <Textarea
                            value={anamnesisAnswers[field.label] || ""}
                            onChange={(e) =>
                              setAnamnesisAnswers({
                                ...anamnesisAnswers,
                                [field.label]: e.target.value,
                              })
                            }
                            rows={3}
                          />
                        )}
                        {field.type === "select" && (
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={anamnesisAnswers[field.label] || ""}
                            onChange={(e) =>
                              setAnamnesisAnswers({
                                ...anamnesisAnswers,
                                [field.label]: e.target.value,
                              })
                            }
                          >
                            <option value="">Selecione...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setAnamnesisDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveAnamnesis}
                    disabled={savingAnamnesis || !selectedTemplate}
                  >
                    {savingAnamnesis ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
