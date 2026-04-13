"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  client: { id: string; name: string };
  service: { id: string; name: string; duration: number };
  employee: { id: string; name: string };
  room: { id: string; name: string; color: string };
}

interface EmployeeStat {
  name: string;
  count: number;
}

interface ServiceStat {
  name: string;
  count: number;
}

interface RoomStat {
  name: string;
  color: string;
  totalMinutes: number;
  occupancyPercent: number;
}

function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0],
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function RelatoriosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set("date", dateRange.start);
      // Use the week param to get a broader date range
      // Actually the API supports date (single day) and week (start of week)
      // For a custom range, we fetch all and filter client side
      // Or just fetch without date filter and filter client-side
      const res = await fetch(`/api/appointments`);
      const data: Appointment[] = await res.json();

      // Filter by date range client-side
      const startDate = dateRange.start
        ? new Date(dateRange.start + "T00:00:00")
        : null;
      const endDate = dateRange.end
        ? new Date(dateRange.end + "T23:59:59")
        : null;

      const filtered = data.filter((apt) => {
        const aptDate = new Date(apt.date);
        if (startDate && aptDate < startDate) return false;
        if (endDate && aptDate > endDate) return false;
        return true;
      });

      setAppointments(filtered);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Calculate stats from non-cancelled appointments
  const validAppointments = appointments.filter(
    (apt) => apt.status !== "cancelled"
  );

  // Appointments by employee
  const employeeStats: EmployeeStat[] = (() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const apt of validAppointments) {
      const existing = map.get(apt.employee.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(apt.employee.id, { name: apt.employee.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  // Most popular services
  const serviceStats: ServiceStat[] = (() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const apt of validAppointments) {
      const existing = map.get(apt.service.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(apt.service.id, { name: apt.service.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  // Room occupancy
  const roomStats: RoomStat[] = (() => {
    const map = new Map<
      string,
      { name: string; color: string; totalMinutes: number }
    >();
    for (const apt of validAppointments) {
      const duration =
        timeToMinutes(apt.endTime) - timeToMinutes(apt.startTime);
      const existing = map.get(apt.room.id);
      if (existing) {
        existing.totalMinutes += duration;
      } else {
        map.set(apt.room.id, {
          name: apt.room.name,
          color: apt.room.color,
          totalMinutes: duration,
        });
      }
    }

    // Calculate number of business days in range
    const startDate = dateRange.start
      ? new Date(dateRange.start + "T12:00:00")
      : new Date();
    const endDate = dateRange.end
      ? new Date(dateRange.end + "T12:00:00")
      : new Date();
    let businessDays = 0;
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const day = cursor.getDay();
      if (day !== 0) businessDays++; // Exclude Sundays
      cursor.setDate(cursor.getDate() + 1);
    }
    if (businessDays === 0) businessDays = 1;

    // Assume 10h workday (600 minutes)
    const maxMinutes = businessDays * 600;

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        occupancyPercent: Math.min(
          100,
          Math.round((r.totalMinutes / maxMinutes) * 100)
        ),
      }))
      .sort((a, b) => b.occupancyPercent - a.occupancyPercent);
  })();

  const totalCompleted = appointments.filter(
    (a) => a.status === "completed"
  ).length;
  const totalConfirmed = appointments.filter(
    (a) => a.status === "confirmed"
  ).length;
  const totalCancelled = appointments.filter(
    (a) => a.status === "cancelled"
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold">Relatórios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Analise o desempenho da clinica
        </p>
      </div>

      {/* Date range */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-start" className="text-xs">
                Data inicial
              </Label>
              <Input
                id="report-start"
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((r) => ({ ...r, start: e.target.value }))
                }
                className="w-40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-end" className="text-xs">
                Data final
              </Label>
              <Input
                id="report-end"
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((r) => ({ ...r, end: e.target.value }))
                }
                className="w-40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchAppointments}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Concluidos</p>
                <p
                  className="text-3xl font-bold mt-2 text-green-600"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {totalCompleted}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Confirmados</p>
                <p
                  className="text-3xl font-bold mt-2 text-blue-600"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {totalConfirmed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Cancelados</p>
                <p
                  className="text-3xl font-bold mt-2 text-red-600"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {totalCancelled}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Appointments by employee */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Agendamentos por Funcionária
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employeeStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Sem dados no periodo.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {employeeStats.map((stat) => (
                      <div
                        key={stat.name}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm truncate">{stat.name}</span>
                        <span
                          className="text-sm font-medium shrink-0 ml-3"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {stat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most popular services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Serviços Mais Populares
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Sem dados no periodo.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {serviceStats.map((stat, idx) => (
                      <div
                        key={stat.name}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm truncate">
                          <span
                            className="text-muted-foreground mr-2"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {idx + 1}.
                          </span>
                          {stat.name}
                        </span>
                        <span
                          className="text-sm font-medium shrink-0 ml-3"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {stat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Room occupancy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ocupação por Sala</CardTitle>
              </CardHeader>
              <CardContent>
                {roomStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Sem dados no periodo.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {roomStats.map((stat) => (
                      <div key={stat.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{stat.name}</span>
                          <span
                            className="text-muted-foreground"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {stat.occupancyPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${stat.occupancyPercent}%`,
                              backgroundColor: stat.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
