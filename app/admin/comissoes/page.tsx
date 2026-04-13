"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Employee {
  id: string;
  name: string;
}

interface Commission {
  id: string;
  date: string;
  clientName: string;
  serviceName: string;
  employeeName: string;
  servicePrice: number;
  commissionRate: number;
  commissionValue: number;
  status: "PENDENTE" | "PAGA";
}

interface CommissionSummary {
  totalPending: number;
  totalPaid: number;
  totalAll: number;
  count: number;
}

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  totalServices: number;
  totalPending: number;
  totalPaid: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
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

export default function ComissoesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({
    totalPending: 0,
    totalPaid: 0,
    totalAll: 0,
    count: 0,
  });
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees?active=true");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Erro ao carregar funcionárias:", err);
    }
  }, []);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEmployee) params.set("employeeId", selectedEmployee);
      if (statusFilter !== "TODOS") params.set("status", statusFilter);
      if (dateRange.start) params.set("startDate", dateRange.start);
      if (dateRange.end) params.set("endDate", dateRange.end);

      const res = await fetch(`/api/commissions?${params.toString()}`);
      const data = await res.json();

      setCommissions(data.commissions || []);
      setSummary(
        data.summary || { totalPending: 0, totalPaid: 0, totalAll: 0, count: 0 }
      );
      setEmployeeSummaries(data.employeeSummaries || []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Erro ao carregar comissões:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, statusFilter, dateRange]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllPending() {
    const pendingIds = commissions
      .filter((c) => c.status === "PENDENTE")
      .map((c) => c.id);
    setSelectedIds(new Set(pendingIds));
  }

  async function handleMarkAsPaid() {
    if (selectedIds.size === 0) return;
    setPaying(true);
    try {
      const res = await fetch("/api/commissions/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        await fetchCommissions();
      } else {
        console.error("Erro ao marcar comissões como pagas");
      }
    } catch (err) {
      console.error("Erro ao marcar comissões como pagas:", err);
    } finally {
      setPaying(false);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  }

  const pendingCommissions = commissions.filter(
    (c) => c.status === "PENDENTE"
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
        <p className="text-muted-foreground">
          Gestão de comissões das colaboradoras
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-filter">Colaboradora</Label>
              <select
                id="employee-filter"
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">Todas</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status-filter">Status</Label>
              <select
                id="status-filter"
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="TODOS">Todos</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="PAGA">Pagas</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date">Data início</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date">Data fim</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>

            <Button onClick={fetchCommissions}>Filtrar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-2xl font-bold text-yellow-900"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatCurrency(summary.totalPending)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-2xl font-bold text-green-900"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatCurrency(summary.totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatCurrency(summary.totalAll)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Qtd. Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {summary.count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">
              Carregando...
            </p>
          ) : commissions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma comissão encontrada para o período selecionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">
                      <input
                        type="checkbox"
                        checked={
                          pendingCommissions.length > 0 &&
                          pendingCommissions.every((c) =>
                            selectedIds.has(c.id)
                          )
                        }
                        onChange={() => {
                          const allSelected = pendingCommissions.every((c) =>
                            selectedIds.has(c.id)
                          );
                          if (allSelected) {
                            setSelectedIds(new Set());
                          } else {
                            selectAllPending();
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-medium">Data</th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Serviço</th>
                    <th className="pb-3 pr-4 font-medium">Colaboradora</th>
                    <th className="pb-3 pr-4 text-right font-medium">
                      Valor Serviço
                    </th>
                    <th className="pb-3 pr-4 text-right font-medium">
                      Taxa (%)
                    </th>
                    <th className="pb-3 pr-4 text-right font-medium">
                      Comissão
                    </th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4">
                        {commission.status === "PENDENTE" ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(commission.id)}
                            onChange={() => toggleSelection(commission.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        ) : (
                          <span className="inline-block h-4 w-4" />
                        )}
                      </td>
                      <td
                        className="py-3 pr-4 whitespace-nowrap"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {formatDate(commission.date)}
                      </td>
                      <td className="py-3 pr-4">{commission.clientName}</td>
                      <td className="py-3 pr-4">{commission.serviceName}</td>
                      <td className="py-3 pr-4">{commission.employeeName}</td>
                      <td
                        className="py-3 pr-4 text-right whitespace-nowrap"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {formatCurrency(commission.servicePrice)}
                      </td>
                      <td
                        className="py-3 pr-4 text-right"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {commission.commissionRate}%
                      </td>
                      <td
                        className="py-3 pr-4 text-right whitespace-nowrap font-semibold"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {formatCurrency(commission.commissionValue)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            commission.status === "PAGA"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            commission.status === "PAGA"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }
                        >
                          {commission.status === "PAGA" ? "Paga" : "Pendente"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Commission Summary */}
      {employeeSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Colaboradora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeSummaries.map((emp) => (
                <div key={emp.employeeId}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{emp.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {emp.totalServices} atendimento
                        {emp.totalServices !== 1 ? "s" : ""} realizado
                        {emp.totalServices !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Pendente
                        </p>
                        <p
                          className="font-semibold text-yellow-700"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {formatCurrency(emp.totalPending)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Pago</p>
                        <p
                          className="font-semibold text-green-700"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {formatCurrency(emp.totalPaid)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm font-medium">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={selectAllPending}>
                Selecionar Todos Pendentes
              </Button>
              <Button onClick={handleMarkAsPaid} disabled={paying}>
                {paying ? "Processando..." : "Marcar como Pago"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer when bulk bar is visible */}
      {selectedIds.size > 0 && <div className="h-20" />}
    </div>
  );
}
