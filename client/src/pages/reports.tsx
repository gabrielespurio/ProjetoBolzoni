import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Users, UserCircle, Calendar, Package, DollarSign, ShoppingCart, AlertCircle } from "lucide-react";
import type { Client, Employee, Event, InventoryItem, FinancialTransaction, Purchase } from "@shared/schema";

type ReportType = "clients" | "employees" | "events" | "pending_events" | "inventory" | "financial" | "purchases";

interface ReportTab {
  id: ReportType;
  title: string;
  icon: typeof Users;
}

const reportTabs: ReportTab[] = [
  { id: "clients", title: "Clientes", icon: Users },
  { id: "employees", title: "Funcionários", icon: UserCircle },
  { id: "events", title: "Eventos", icon: Calendar },
  { id: "pending_events", title: "Pendências de Eventos", icon: AlertCircle },
  { id: "inventory", title: "Estoque", icon: Package },
  { id: "financial", title: "Financeiro", icon: DollarSign },
  { id: "purchases", title: "Compras", icon: ShoppingCart },
];

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

function convertToCSV<T extends Record<string, unknown>>(data: T[], columns: { key: keyof T; label: string }[]): string {
  const headers = columns.map((col) => col.label).join(";");
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        if (value === null || value === undefined) return "";
        if (typeof value === "object" && value !== null && value instanceof Date) {
          return formatDate(value);
        }
        const stringValue = String(value);
        if (stringValue.includes(";") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(";")
  );
  return [headers, ...rows].join("\n");
}

function downloadCSV(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ClientsReport() {
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const columns: { key: keyof Client; label: string }[] = [
    { key: "name", label: "Nome" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "cpf", label: "CPF" },
    { key: "cidade", label: "Cidade" },
    { key: "estado", label: "Estado" },
    { key: "createdAt", label: "Data Cadastro" },
  ];

  const clientList: Client[] = Array.isArray(clients) ? clients : [];

  const handleExport = () => {
    if (!clientList.length) return;
    const csvContent = convertToCSV(clientList, columns);
    downloadCSV(csvContent, "relatorio_clientes");
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-clients-count">
            {clientList.length} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!clientList.length} data-testid="button-export-clients">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientList.map((client) => (
              <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.phone || "-"}</TableCell>
                <TableCell>{client.email || "-"}</TableCell>
                <TableCell>{client.cpf || "-"}</TableCell>
                <TableCell>{client.cidade || "-"}</TableCell>
                <TableCell>{client.estado || "-"}</TableCell>
                <TableCell>{formatDate(client.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!clientList.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum cliente cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EmployeesReport() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const columns: { key: keyof Employee; label: string }[] = [
    { key: "name", label: "Nome" },
    { key: "role", label: "Função" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "cpf", label: "CPF" },
    { key: "cidade", label: "Cidade" },
    { key: "isAvailable", label: "Disponível" },
    { key: "createdAt", label: "Data Cadastro" },
  ];

  const employeeList: Employee[] = Array.isArray(employees) ? employees : [];

  const handleExport = () => {
    if (!employeeList.length) return;
    const dataToExport = employeeList.map((emp) => ({
      ...emp,
      isAvailable: emp.isAvailable ? "Sim" : "Não",
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_funcionarios");
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-employees-count">
            {employeeList.length} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!employeeList.length} data-testid="button-export-employees">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employeeList.map((employee) => (
              <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>{employee.phone || "-"}</TableCell>
                <TableCell>{employee.email || "-"}</TableCell>
                <TableCell>{employee.cpf || "-"}</TableCell>
                <TableCell>{employee.cidade || "-"}</TableCell>
                <TableCell>
                  <Badge variant={employee.isAvailable ? "default" : "secondary"}>
                    {employee.isAvailable ? "Sim" : "Não"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(employee.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!employeeList.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum funcionário cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface EventWithDetails extends Event {
  clientName?: string;
}

function EventsReport() {
  const { data: events, isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events"],
  });

  const eventList: EventWithDetails[] = Array.isArray(events) ? events : [];

  const columns = [
    { key: "title" as keyof EventWithDetails, label: "Título" },
    { key: "clientName" as keyof EventWithDetails, label: "Cliente" },
    { key: "date" as keyof EventWithDetails, label: "Data" },
    { key: "cidade" as keyof EventWithDetails, label: "Cidade" },
    { key: "contractValue" as keyof EventWithDetails, label: "Valor Contrato" },
    { key: "status" as keyof EventWithDetails, label: "Status" },
    { key: "createdAt" as keyof EventWithDetails, label: "Data Cadastro" },
  ];

  const handleExport = () => {
    if (!eventList.length) return;
    const dataToExport = eventList.map((event) => ({
      ...event,
      status: getStatusLabel(event.status),
      contractValue: event.contractValue,
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_eventos");
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
      deleted: "Excluído",
      paid_entry: "Entrada Paga",
      paid_full: "Total Pago",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      scheduled: "default",
      completed: "secondary",
      cancelled: "destructive",
      deleted: "destructive",
      paid_entry: "default",
      paid_full: "default",
    };
    const colors: Record<string, string> = {
      paid_entry: "bg-emerald-600 text-white hover:bg-emerald-700",
      paid_full: "bg-teal-600 text-white hover:bg-teal-700",
    };
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-events-count">
            {eventList.length} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!eventList.length} data-testid="button-export-events">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Valor Contrato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventList.map((event) => (
              <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>{event.clientName || "-"}</TableCell>
                <TableCell>{formatDate(event.date)}</TableCell>
                <TableCell>{event.cidade || "-"}</TableCell>
                <TableCell>{formatCurrency(event.contractValue)}</TableCell>
                <TableCell>{getStatusBadge(event.status)}</TableCell>
                <TableCell>{formatDate(event.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!eventList.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum evento cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InventoryReport() {
  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const columns: { key: keyof InventoryItem; label: string }[] = [
    { key: "name", label: "Nome" },
    { key: "type", label: "Tipo" },
    { key: "quantity", label: "Quantidade" },
    { key: "minQuantity", label: "Qtd Mínima" },
    { key: "unit", label: "Unidade" },
    { key: "costPrice", label: "Preço Custo" },
    { key: "salePrice", label: "Preço Venda" },
    { key: "createdAt", label: "Data Cadastro" },
  ];

  const itemList: InventoryItem[] = Array.isArray(items) ? items : [];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "character": return "Personagem";
      case "part": return "Parte/Peça";
      case "material": return "Material";
      case "accessory": return "Acessório";
      default: return type;
    }
  };

  const handleExport = () => {
    if (!itemList.length) return;
    const dataToExport = itemList.map((item) => ({
      ...item,
      type: getTypeLabel(item.type),
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_estoque");
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-inventory-count">
            {itemList.length} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!itemList.length} data-testid="button-export-inventory">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Qtd Mínima</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Preço Custo</TableHead>
              <TableHead>Preço Venda</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemList.map((item) => (
              <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{getTypeLabel(item.type)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.quantity <= item.minQuantity ? "destructive" : "default"}>
                    {item.quantity}
                  </Badge>
                </TableCell>
                <TableCell>{item.minQuantity}</TableCell>
                <TableCell>{item.unit || "-"}</TableCell>
                <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                <TableCell>{formatCurrency(item.salePrice)}</TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!itemList.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum item cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FinancialReport() {
  const { data: transactions, isLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial/transactions"],
  });

  const columns: { key: keyof FinancialTransaction; label: string }[] = [
    { key: "type", label: "Tipo" },
    { key: "description", label: "Descrição" },
    { key: "amount", label: "Valor" },
    { key: "dueDate", label: "Vencimento" },
    { key: "paidDate", label: "Data Pagamento" },
    { key: "isPaid", label: "Pago" },
    { key: "createdAt", label: "Data Cadastro" },
  ];

  const transactionList: FinancialTransaction[] = Array.isArray(transactions) ? transactions : [];

  const handleExport = () => {
    if (!transactionList.length) return;
    const dataToExport = transactionList.map((t) => ({
      ...t,
      type: t.type === "receivable" ? "A Receber" : "A Pagar",
      isPaid: t.isPaid ? "Sim" : "Não",
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_financeiro");
  };

  const getTypeLabel = (type: string) => {
    return type === "receivable" ? "A Receber" : "A Pagar";
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  const summary = transactionList.reduce(
    (acc, t) => {
      const amount = parseFloat(t.amount || "0");
      if (t.type === "receivable") {
        acc.receivable += amount;
        if (t.isPaid) acc.received += amount;
      } else {
        acc.payable += amount;
        if (t.isPaid) acc.paid += amount;
      }
      return acc;
    },
    { receivable: 0, payable: 0, received: 0, paid: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total a Receber</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.receivable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Recebido</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.received)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total a Pagar</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.payable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Pago</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.paid)}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-financial-count">
            {transactionList.length} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!transactionList.length} data-testid="button-export-financial">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Data Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionList.map((transaction) => (
              <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                <TableCell>
                  <Badge variant={transaction.type === "receivable" ? "default" : "secondary"}>
                    {getTypeLabel(transaction.type)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{transaction.description}</TableCell>
                <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                <TableCell>{formatDate(transaction.dueDate)}</TableCell>
                <TableCell>{formatDate(transaction.paidDate)}</TableCell>
                <TableCell>
                  <Badge variant={transaction.isPaid ? "default" : "destructive"}>
                    {transaction.isPaid ? "Pago" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(transaction.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!transactionList.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma transação cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PurchasesReport() {
  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const columns: { key: keyof Purchase; label: string }[] = [
    { key: "supplier", label: "Fornecedor" },
    { key: "description", label: "Descrição" },
    { key: "amount", label: "Valor" },
    { key: "quantity", label: "Quantidade" },
    { key: "purchaseDate", label: "Data Compra" },
    { key: "isInstallment", label: "Parcelado" },
    { key: "installments", label: "Parcelas" },
    { key: "createdAt", label: "Data Cadastro" },
  ];

  const purchaseList: Purchase[] = Array.isArray(purchases) ? purchases : [];

  const handleExport = () => {
    if (!purchaseList.length) return;
    const dataToExport = purchaseList.map((p) => ({
      ...p,
      isInstallment: p.isInstallment ? "Sim" : "Não",
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_compras");
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  const totalAmount = purchaseList.reduce((acc, p) => acc + parseFloat(p.amount || "0"), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total de Compras</div>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Quantidade de Compras</div>
            <div className="text-2xl font-bold">{purchaseList.length}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-purchases-count">
            {purchaseList.length} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!purchaseList.length} data-testid="button-export-purchases">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Data Compra</TableHead>
              <TableHead>Parcelado</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseList.map((purchase) => (
              <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                <TableCell className="font-medium">{purchase.supplier}</TableCell>
                <TableCell>{purchase.description}</TableCell>
                <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                <TableCell>{purchase.quantity || "-"}</TableCell>
                <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                <TableCell>
                  <Badge variant={purchase.isInstallment ? "default" : "secondary"}>
                    {purchase.isInstallment ? "Sim" : "Não"}
                  </Badge>
                </TableCell>
                <TableCell>{purchase.installments || "-"}</TableCell>
                <TableCell>{formatDate(purchase.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!purchaseList.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma compra cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface PendingEventItem {
  eventId: string;
  title: string;
  date: string;
  contractValue: number;
  ticketValue?: number;
  installmentsTotal?: number;
  totalPaid: number;
  remaining: number;
  daysUntil: number;
}

function PendingEventsReport() {
  const { data: pendingEvents, isLoading } = useQuery<PendingEventItem[]>({
    queryKey: ["/api/notifications/pending-payments"],
  });

  const columns = [
    { key: "title" as const, label: "Evento" },
    { key: "dataEvento" as const, label: "Data do Evento" },
    { key: "situacao" as const, label: "Situação / Atraso" },
    { key: "contratoStr" as const, label: "Valor Contrato" },
    { key: "entradaStr" as const, label: "Entrada/Sinal Informada" },
    { key: "parcelasStr" as const, label: "Soma das Parcelas" },
    { key: "recebidoStr" as const, label: "Total Recebido" },
    { key: "restanteStr" as const, label: "Saldo Restante Pendente" },
  ];

  const pendingList: PendingEventItem[] = Array.isArray(pendingEvents) ? pendingEvents : [];

  const handleExport = () => {
    if (!pendingList.length) return;
    const dataToExport = pendingList.map((p) => ({
      title: p.title,
      dataEvento: formatDate(p.date),
      situacao: p.daysUntil < 0 ? `${Math.abs(p.daysUntil)} dias atrás (Atrasado)` : p.daysUntil === 0 ? "HOJE" : `Daqui a ${p.daysUntil} dias`,
      contratoStr: formatCurrency(p.contractValue),
      entradaStr: formatCurrency(p.ticketValue || 0),
      parcelasStr: formatCurrency(p.installmentsTotal || 0),
      recebidoStr: formatCurrency(p.totalPaid),
      restanteStr: formatCurrency(p.remaining),
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_pendencias_eventos");
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  const summary = pendingList.reduce(
    (acc, p) => {
      acc.contract += p.contractValue || 0;
      acc.paid += p.totalPaid || 0;
      acc.remaining += p.remaining || 0;
      return acc;
    },
    { contract: 0, paid: 0, remaining: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Eventos Pendentes</div>
            <div className="text-2xl font-bold text-amber-600">{pendingList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Contratado</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.contract)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Já Recebido</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Saldo Pendente a Receber</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.remaining)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-pending-events-count">
            {pendingList.length} registros pendentes
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!pendingList.length} data-testid="button-export-pending-events" className="bg-red-600 hover:bg-red-700 text-white">
          <Download className="mr-2 h-4 w-4" />
          Exportar para Excel / CSV
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Data do Evento</TableHead>
              <TableHead>Situação / Atraso</TableHead>
              <TableHead>Valor Contrato</TableHead>
              <TableHead>Entrada / Sinal</TableHead>
              <TableHead>Parcelas Pagas</TableHead>
              <TableHead>Total Recebido</TableHead>
              <TableHead>Saldo Restante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingList.map((p) => (
              <TableRow key={p.eventId} data-testid={`row-pending-event-${p.eventId}`}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{formatDate(p.date)}</TableCell>
                <TableCell>
                  <Badge variant={p.daysUntil < 0 ? "destructive" : p.daysUntil === 0 ? "default" : "secondary"}>
                    {p.daysUntil < 0
                      ? `${Math.abs(p.daysUntil)} dias atrás`
                      : p.daysUntil === 0
                      ? "HOJE"
                      : `Daqui a ${p.daysUntil} dias`}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{formatCurrency(p.contractValue)}</TableCell>
                <TableCell className="text-purple-600 font-mono">{formatCurrency(p.ticketValue || 0)}</TableCell>
                <TableCell className="font-mono">{formatCurrency(p.installmentsTotal || 0)}</TableCell>
                <TableCell className="text-green-600 font-mono font-semibold">{formatCurrency(p.totalPaid)}</TableCell>
                <TableCell className="text-red-600 font-mono font-bold">{formatCurrency(p.remaining)}</TableCell>
              </TableRow>
            ))}
            {!pendingList.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma pendência financeira encontrada nos eventos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportType>("clients");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-reports-title">
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize e exporte relatórios de todos os módulos do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Exportação em CSV</span>
        </div>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border pb-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)} className="w-full">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
              {reportTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab}>
            <TabsContent value="clients" className="mt-0">
              <ClientsReport />
            </TabsContent>
            <TabsContent value="employees" className="mt-0">
              <EmployeesReport />
            </TabsContent>
            <TabsContent value="events" className="mt-0">
              <EventsReport />
            </TabsContent>
            <TabsContent value="pending_events" className="mt-0">
              <PendingEventsReport />
            </TabsContent>
            <TabsContent value="inventory" className="mt-0">
              <InventoryReport />
            </TabsContent>
            <TabsContent value="financial" className="mt-0">
              <FinancialReport />
            </TabsContent>
            <TabsContent value="purchases" className="mt-0">
              <PurchasesReport />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
