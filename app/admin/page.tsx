"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  todayAppointments: number;
  weekAppointments: number;
  pendingCount: number;
  totalClients: number;
  roomOccupancy: {
    id: string;
    name: string;
    color: string;
    occupancy: number;
    appointmentCount: number;
  }[];
  upcomingAppointments: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    client: { name: string };
    service: { name: string };
    employee: { name: string };
    room: { name: string; color: string };
  }[];
  clinicName: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{data.clinicName} — Visão geral</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Agendamentos Hoje</p>
            <p className="text-3xl font-bold mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{data.todayAppointments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Esta Semana</p>
            <p className="text-3xl font-bold mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{data.weekAppointments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-3xl font-bold mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{data.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
            <p className="text-3xl font-bold mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{data.totalClients}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ocupação por Sala (Hoje)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.roomOccupancy.map((room) => (
              <div key={room.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{room.name}</span>
                  <span className="text-muted-foreground">{room.occupancy}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${room.occupancy}%`,
                      backgroundColor: room.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {data.roomOccupancy.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhuma sala cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{apt.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(apt.date).toLocaleDateString("pt-BR")} | {apt.startTime} - {apt.endTime} | {apt.service.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apt.employee.name} — {apt.room.name}
                    </p>
                  </div>
                  <Badge className={statusColors[apt.status] || ""} variant="secondary">
                    {statusLabels[apt.status] || apt.status}
                  </Badge>
                </div>
              ))}
              {data.upcomingAppointments.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhum agendamento próximo
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
