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
import { Download, FileSpreadsheet, Users, UserCircle, Calendar, Package, DollarSign, ShoppingCart } from "lucide-react";
import type { Client, Employee, Event, InventoryItem, FinancialTransaction, Purchase } from "@shared/schema";

type ReportType = "clients" | "employees" | "events" | "inventory" | "financial" | "purchases";

interface ReportTab {
  id: ReportType;
  title: string;
  icon: typeof Users;
}

const reportTabs: ReportTab[] = [
  { id: "clients", title: "Clientes", icon: Users },
  { id: "employees", title: "Funcionários", icon: UserCircle },
  { id: "events", title: "Eventos", icon: Calendar },
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

  const handleExport = () => {
    if (!clients) return;
    const csvContent = convertToCSV(clients, columns);
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
            {clients?.length || 0} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!clients?.length} data-testid="button-export-clients">
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
            {clients?.map((client) => (
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
            {!clients?.length && (
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

  const handleExport = () => {
    if (!employees) return;
    const dataToExport = employees.map((emp) => ({
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
            {employees?.length || 0} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!employees?.length} data-testid="button-export-employees">
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
            {employees?.map((employee) => (
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
            {!employees?.length && (
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
    if (!events) return;
    const dataToExport = events.map((event) => ({
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
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      scheduled: "default",
      completed: "secondary",
      cancelled: "destructive",
      deleted: "destructive",
    };
    return <Badge variant={variants[status]}>{getStatusLabel(status)}</Badge>;
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-events-count">
            {events?.length || 0} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!events?.length} data-testid="button-export-events">
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
            {events?.map((event) => (
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
            {!events?.length && (
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

  const handleExport = () => {
    if (!items) return;
    const dataToExport = items.map((item) => ({
      ...item,
      type: item.type === "consumable" ? "Consumível" : "Personagem",
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_estoque");
  };

  const getTypeLabel = (type: string) => {
    return type === "consumable" ? "Consumível" : "Personagem";
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-inventory-count">
            {items?.length || 0} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!items?.length} data-testid="button-export-inventory">
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
            {items?.map((item) => (
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
            {!items?.length && (
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

  const handleExport = () => {
    if (!transactions) return;
    const dataToExport = transactions.map((t) => ({
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

  const summary = transactions?.reduce(
    (acc, t) => {
      const amount = parseFloat(t.amount);
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
  ) || { receivable: 0, payable: 0, received: 0, paid: 0 };

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
            {transactions?.length || 0} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!transactions?.length} data-testid="button-export-financial">
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
            {transactions?.map((transaction) => (
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
            {!transactions?.length && (
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

  const handleExport = () => {
    if (!purchases) return;
    const dataToExport = purchases.map((p) => ({
      ...p,
      isInstallment: p.isInstallment ? "Sim" : "Não",
    }));
    const csvContent = convertToCSV(dataToExport, columns);
    downloadCSV(csvContent, "relatorio_compras");
  };

  if (isLoading) {
    return <ReportSkeleton />;
  }

  const totalAmount = purchases?.reduce((acc, p) => acc + parseFloat(p.amount), 0) || 0;

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
            <div className="text-2xl font-bold">{purchases?.length || 0}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-purchases-count">
            {purchases?.length || 0} registros
          </Badge>
        </div>
        <Button onClick={handleExport} disabled={!purchases?.length} data-testid="button-export-purchases">
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
            {purchases?.map((purchase) => (
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
            {!purchases?.length && (
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
