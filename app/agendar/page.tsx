"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Types ───────────────────────────────────────────────────────────────────

interface ServiceGroup {
  id: string;
  name: string;
  services: Service[];
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Employee {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface Room {
  id: string;
  name: string;
}

interface BookingResult {
  appointment: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    client: { name: string; phone: string; email: string | null };
    service: { name: string; price: number; duration: number };
    employee: { name: string };
    room: { name: string };
  };
  whatsappLink: string | null;
  message: string;
}

// ── Step Indicator ──────────────────────────────────────────────────────────

const STEP_LABELS = ["Servico", "Profissional", "Data e Hora", "Seus Dados", "Confirmacao"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium
                  transition-all duration-300
                  ${isActive ? "bg-primary text-primary-foreground shadow-md scale-110" : ""}
                  ${isDone ? "bg-primary/20 text-primary" : ""}
                  ${!isActive && !isDone ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`
                  text-[10px] sm:text-xs hidden sm:block transition-colors duration-300
                  ${isActive ? "text-primary font-medium" : "text-muted-foreground/60"}
                `}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`
                  w-6 sm:w-10 h-[2px] mx-1 sm:mx-2 rounded-full transition-colors duration-300
                  ${isDone ? "bg-primary/30" : "bg-muted"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Fade Wrapper ────────────────────────────────────────────────────────────

function FadeIn({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  return (
    <div key={stepKey} className="animate-fade-in">
      {children}
    </div>
  );
}

// ── Price Formatter ─────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);
}

// ── Date Helpers ────────────────────────────────────────────────────────────

function generateNext30Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ── Main Component ──────────────────────────────────────────────────────────

export default function AgendarPage() {
  const [step, setStep] = useState(1);

  // Selections
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null);
  const [publicServiceSearch, setPublicServiceSearch] = useState("");
  const [, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<BookingResult | null>(null);

  // ── Step 1: Load services ──────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    fetch("/api/booking?action=services")
      .then((r) => r.json())
      .then((data: { groups: ServiceGroup[]; ungrouped: Service[] }) => {
        setServiceGroups(data.groups || []);
        // Flatten all services for compatibility
        const all = [
          ...(data.groups || []).flatMap((g) => g.services),
          ...(data.ungrouped || []),
        ];
        setServices(all);
      })
      .catch(() => setError("Erro ao carregar serviços."))
      .finally(() => setLoading(false));
  }, []);

  // ── Step 2: Load employees when service is selected ────────────────────

  useEffect(() => {
    if (!selectedService) return;
    setLoading(true);
    setEmployees([]);
    setSelectedEmployee(null);
    fetch(`/api/booking?action=employees&serviceId=${selectedService.id}`)
      .then((r) => r.json())
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => setError("Erro ao carregar profissionais."))
      .finally(() => setLoading(false));
  }, [selectedService]);

  // ── Load rooms when employee is selected ───────────────────────────────

  const fetchRooms = useCallback(async (serviceId: string, employeeId: string) => {
    const res = await fetch(`/api/booking?action=rooms&serviceId=${serviceId}&employeeId=${employeeId}`);
    const data: Room[] = await res.json();
    setRooms(data);
    if (data.length === 1) {
      setSelectedRoom(data[0]);
    } else {
      setSelectedRoom(null);
    }
    return data;
  }, []);

  useEffect(() => {
    if (!selectedService || !selectedEmployee) return;
    setRooms([]);
    setSelectedRoom(null);
    fetchRooms(selectedService.id, selectedEmployee.id);
  }, [selectedService, selectedEmployee, fetchRooms]);

  // ── Step 3: Load slots when date is selected ──────────────────────────

  useEffect(() => {
    if (!selectedService || !selectedEmployee || !selectedRoom || !selectedDate) return;
    setLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    const dateStr = formatDateISO(selectedDate);
    fetch(
      `/api/booking?action=slots&serviceId=${selectedService.id}&employeeId=${selectedEmployee.id}&roomId=${selectedRoom.id}&date=${dateStr}`
    )
      .then((r) => r.json())
      .then((data: string[]) => setSlots(data))
      .catch(() => setError("Erro ao carregar horarios."))
      .finally(() => setLoading(false));
  }, [selectedService, selectedEmployee, selectedRoom, selectedDate]);

  // ── Navigation ─────────────────────────────────────────────────────────

  function goNext() {
    setError(null);
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setStep((s) => s - 1);
  }

  // ── Submit Booking ─────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!clientName.trim() || !clientPhone.trim()) {
      setError("Nome e telefone sao obrigatorios.");
      return;
    }
    if (!selectedService || !selectedEmployee || !selectedRoom || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          employeeId: selectedEmployee.id,
          roomId: selectedRoom.id,
          date: formatDateISO(selectedDate),
          startTime: selectedSlot,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao agendar.");
      }

      const data: BookingResult = await res.json();
      setResult(data);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Phone mask ─────────────────────────────────────────────────────────

  function handlePhoneChange(value: string) {
    // Portuguese phone format: +351 9XX XXX XXX
    let digits = value.replace(/\D/g, "");
    // Auto-prepend 351 if starts with 9
    if (digits.length > 0 && digits[0] === "9") {
      digits = "351" + digits;
    }
    digits = digits.slice(0, 12); // 351 + 9 digits
    let masked = digits;
    if (digits.length > 3) {
      masked = `+${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
    if (digits.length > 6) {
      masked = `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (digits.length > 9) {
      masked = `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    setClientPhone(masked);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const next30Days = generateNext30Days();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Voltar
          </Link>
          <h2 className="text-lg font-semibold text-foreground">Agendamento</h2>
          <div className="w-14" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* ── Step 1: Choose Group then Service ──────────────────────────── */}
        {step === 1 && (
          <FadeIn stepKey="step-1">
            {!selectedGroup ? (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold text-foreground mb-1">Escolha a categoria</h3>
                  <p className="text-sm text-muted-foreground">Selecione o tipo de tratamento</p>
                </div>

                {loading ? (
                  <LoadingPulse />
                ) : (
                  <div className="grid gap-3">
                    {serviceGroups.map((group) => (
                      <Card
                        key={group.id}
                        className="cursor-pointer transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/30"
                        onClick={() => setSelectedGroup(group)}
                      >
                        <CardContent className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{group.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {group.services.length} serviço{group.services.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold text-foreground mb-1">{selectedGroup.name}</h3>
                  <p className="text-sm text-muted-foreground">Selecione o serviço desejado</p>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
                    onClick={() => { setSelectedGroup(null); setSelectedService(null); setPublicServiceSearch(""); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar
                  </button>
                  <Input
                    placeholder="Pesquisar serviço..."
                    value={publicServiceSearch}
                    onChange={(e) => setPublicServiceSearch(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="grid gap-3">
                  {selectedGroup.services.filter((s) =>
                    !publicServiceSearch || s.name.toLowerCase().includes(publicServiceSearch.toLowerCase())
                  ).map((service) => (
                    <Card
                      key={service.id}
                      className={`
                        cursor-pointer transition-all duration-200 hover:shadow-md
                        ${selectedService?.id === service.id ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-primary/30"}
                      `}
                      onClick={() => setSelectedService(service)}
                    >
                      <CardContent className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{service.duration} min</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{formatPrice(service.price)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    size="lg"
                    className="rounded-full px-8"
                    disabled={!selectedService}
                    onClick={goNext}
                  >
                    Continuar
                  </Button>
                </div>
              </>
            )}
          </FadeIn>
        )}

        {/* ── Step 2: Choose Employee ────────────────────────────────────── */}
        {step === 2 && (
          <FadeIn stepKey="step-2">
            {/* Previous selection summary */}
            {selectedService && (
              <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground">Serviço selecionado</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedGroup?.name && <span className="text-muted-foreground">{selectedGroup.name} &rsaquo; </span>}
                  {selectedService.name}
                  <span className="text-muted-foreground ml-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {selectedService.duration}min · {formatPrice(selectedService.price)}
                  </span>
                </p>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-foreground mb-1">Escolha o profissional</h3>
              <p className="text-sm text-muted-foreground">Quem prefere para o atendimento?</p>
            </div>

            {loading ? (
              <LoadingPulse />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {employees.map((emp) => (
                  <Card
                    key={emp.id}
                    className={`
                      cursor-pointer transition-all duration-200 hover:shadow-md text-center
                      ${selectedEmployee?.id === emp.id ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-primary/30"}
                    `}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <CardContent className="flex flex-col items-center py-2">
                      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-2 overflow-hidden">
                        {emp.photoUrl ? (
                          <img
                            src={emp.photoUrl}
                            alt={emp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-semibold text-primary/60">
                            {emp.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-foreground text-sm">{emp.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Room selection (only when multiple rooms) */}
            {selectedEmployee && rooms.length > 1 && (
              <div className="mt-6 animate-fade-in">
                <p className="text-sm text-muted-foreground text-center mb-3">Escolha a sala</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                        ${selectedRoom?.id === room.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }
                      `}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" size="lg" className="rounded-full px-6" onClick={goBack}>
                Voltar
              </Button>
              <Button
                size="lg"
                className="rounded-full px-8"
                disabled={!selectedEmployee || (rooms.length > 1 && !selectedRoom)}
                onClick={goNext}
              >
                Continuar
              </Button>
            </div>
          </FadeIn>
        )}

        {/* ── Step 3: Choose Date & Time ─────────────────────────────────── */}
        {step === 3 && (
          <FadeIn stepKey="step-3">
            {/* Previous selections summary */}
            {selectedService && selectedEmployee && (
              <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div>
                  <p className="text-xs text-muted-foreground">Serviço</p>
                  <p className="text-sm font-medium">
                    {selectedService.name}
                    <span className="text-muted-foreground ml-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {selectedService.duration}min · {formatPrice(selectedService.price)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profissional</p>
                  <p className="text-sm font-medium">{selectedEmployee.name}</p>
                </div>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-foreground mb-1">Escolha a data e horário</h3>
              <p className="text-sm text-muted-foreground">Selecione o melhor dia e horário para si</p>
            </div>

            {/* Date Grid */}
            <div className="mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">Data</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
                {next30Days.map((day) => {
                  const isSelected = selectedDate && formatDateISO(selectedDate) === formatDateISO(day);
                  const isToday = formatDateISO(day) === formatDateISO(new Date());
                  const isSunday = day.getDay() === 0;

                  return (
                    <button
                      key={formatDateISO(day)}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedSlot(null);
                      }}
                      disabled={isSunday}
                      className={`
                        flex-shrink-0 snap-start w-16 py-3 rounded-xl flex flex-col items-center gap-0.5
                        transition-all duration-200 border
                        ${isSunday ? "opacity-40 cursor-not-allowed border-transparent" : "cursor-pointer"}
                        ${isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                          : "bg-card border-border/50 hover:border-primary/30 hover:shadow-sm"
                        }
                      `}
                    >
                      <span className={`text-[10px] uppercase font-medium ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {WEEKDAY_SHORT[day.getDay()]}
                      </span>
                      <span className={`text-lg font-semibold ${isSelected ? "" : "text-foreground"}`}>
                        {day.getDate()}
                      </span>
                      <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {MONTH_SHORT[day.getMonth()]}
                      </span>
                      {isToday && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="animate-fade-in">
                <p className="text-sm font-medium text-muted-foreground mb-3">Horarios disponiveis</p>
                {loading ? (
                  <LoadingPulse />
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 text-center py-8">
                    Nenhum horario disponivel nesta data.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`
                          py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border
                          ${selectedSlot === slot
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card border-border/50 text-foreground hover:border-primary/30 hover:shadow-sm"
                          }
                        `}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" size="lg" className="rounded-full px-6" onClick={goBack}>
                Voltar
              </Button>
              <Button
                size="lg"
                className="rounded-full px-8"
                disabled={!selectedDate || !selectedSlot}
                onClick={goNext}
              >
                Continuar
              </Button>
            </div>
          </FadeIn>
        )}

        {/* ── Step 4: Personal Data ──────────────────────────────────────── */}
        {step === 4 && (
          <FadeIn stepKey="step-4">
            {/* Previous selections summary */}
            {selectedService && selectedEmployee && selectedDate && selectedSlot && (
              <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Serviço</p>
                    <p className="text-sm font-medium">{selectedService.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-sm font-semibold text-primary" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formatPrice(selectedService.price)}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="text-sm font-medium">{selectedEmployee.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Data / Hora</p>
                    <p className="text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {selectedDate.toLocaleDateString("pt-PT")} · {selectedSlot}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-foreground mb-1">Os seus dados</h3>
              <p className="text-sm text-muted-foreground">Preencha as suas informações para confirmar</p>
            </div>

            <Card>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telemóvel (WhatsApp) *</Label>
                  <Input
                    id="phone"
                    placeholder="+351 9XX XXX XXX"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Booking Summary */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Resumo</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Servico</span>
                      <span className="font-medium">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profissional</span>
                      <span className="font-medium">{selectedEmployee?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-medium">
                        {selectedDate?.toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horario</span>
                      <span className="font-medium">{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/30">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-semibold text-primary">
                        {selectedService ? formatPrice(selectedService.price) : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" size="lg" className="rounded-full px-6" onClick={goBack}>
                Voltar
              </Button>
              <Button
                size="lg"
                className="rounded-full px-8"
                disabled={!clientName.trim() || !clientPhone.trim() || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Agendando...
                  </span>
                ) : (
                  "Confirmar Agendamento"
                )}
              </Button>
            </div>
          </FadeIn>
        )}

        {/* ── Step 5: Confirmation ───────────────────────────────────────── */}
        {step === 5 && result && (
          <FadeIn stepKey="step-5">
            <div className="text-center mb-8">
              {/* Success Icon */}
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-1">Agendamento Confirmado!</h3>
              <p className="text-sm text-muted-foreground">Seu horario foi reservado com sucesso</p>
            </div>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Servico</span>
                  <span className="font-medium">{result.appointment.service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">{result.appointment.employee.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {new Date(result.appointment.date).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horario</span>
                  <span className="font-medium">
                    {result.appointment.startTime} - {result.appointment.endTime}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sala</span>
                  <span className="font-medium">{result.appointment.room.name}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border/30">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold text-primary">
                    {formatPrice(result.appointment.service.price)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-col gap-3">
              {result.whatsappLink && (
                <a href={result.whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    className="w-full rounded-full h-12 text-base gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Enviar mensagem no WhatsApp
                  </Button>
                </a>
              )}

              <Link href="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-full h-12 text-base"
                >
                  Voltar ao inicio
                </Button>
              </Link>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────

function LoadingPulse() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}
