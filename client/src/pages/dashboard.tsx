import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, Calendar, Package, TrendingUp, ArrowUpRight, 
  ArrowDownRight, Percent, CheckCircle, AlertTriangle, ListTodo, FileSpreadsheet, ArrowLeftRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatLocalDate } from "@/lib/date-utils";

interface DashboardMetrics {
  cashBalance: number;
  monthlyRevenue: number;
  eventsThisMonth: number;
  lowStockItems: number;
  monthlyRevenueChart: Array<{ month: string; revenue: number }>;
  cashFlowChart: Array<{ date: string; balance: number }>;
  financialSummary?: {
    totalReceivablePending: number;
    totalPayablePending: number;
    totalReceivablePaid: number;
    totalPayablePaid: number;
    recentTransactions: Array<{
      id: string;
      description: string;
      amount: string;
      type: "receivable" | "payable";
      dueDate: string;
      isPaid: boolean;
      paidDate: string | null;
    }>;
  };
  eventSummary?: {
    totalEvents: number;
    scheduledEvents: number;
    completedEvents: number;
    cancelledEvents: number;
    recentEvents: Array<{
      id: string;
      title: string;
      clientName: string;
      date: string;
      status: string;
      contractValue: string;
    }>;
    eventsByMonthChart: Array<{ month: string; count: number }>;
  };
  quoteSummary?: {
    totalQuotes: number;
    approvedQuotes: number;
    pendingQuotes: number;
    rejectedQuotes: number;
    totalQuotesValue: number;
    recentQuotes: Array<{
      id: string;
      clientName: string;
      eventType: string;
      totalValue: string;
      status: string;
      createdAt: string;
    }>;
    conversionRate: number;
  };
  inventorySummary?: {
    totalItems: number;
    lowStockItemsCount: number;
    totalStockValue: number;
    lowStockItemsList: Array<{
      id: string;
      name: string;
      quantity: number;
      minQuantity: number;
      unit: string | null;
    }>;
    recentMovements: Array<{
      id: string;
      itemName: string;
      quantity: number;
      type: "entrada" | "saida";
      createdAt: string;
      notes: string | null;
    }>;
  };
}

interface UpcomingEvent {
  id: string;
  title: string;
  clientName: string;
  date: string;
  contractValue: string;
  status: string;
}

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<UpcomingEvent[]>({
    queryKey: ["/api/dashboard/upcoming-events"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      scheduled: "default",
      completed: "secondary",
      cancelled: "destructive",
      paid_entry: "default",
      paid_full: "default",
      deleted: "destructive",
    };
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
      paid_entry: "Entrada Paga",
      paid_full: "Total Pago",
      deleted: "Excluído",
    };
    const colors: Record<string, string> = {
      paid_entry: "bg-emerald-600 text-white hover:bg-emerald-700",
      paid_full: "bg-teal-600 text-white hover:bg-teal-700",
    };
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getQuoteStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Rascunho",
      sent: "Enviado",
      approved: "Aprovado",
      rejected: "Rejeitado",
    };
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700 border border-gray-200",
      sent: "bg-blue-50 text-blue-700 border border-blue-200",
      approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      rejected: "bg-red-50 text-red-700 border border-red-200",
    };
    return (
      <Badge variant="outline" className={colors[status] || "bg-gray-100"}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Geral Card Cards Definition
  const generalMetricCards = [
    {
      title: "Saldo de Caixa",
      value: metrics?.cashBalance || 0,
      icon: DollarSign,
      format: "currency",
      testId: "metric-cash-balance",
    },
    {
      title: "Faturamento Mensal",
      value: metrics?.monthlyRevenue || 0,
      icon: TrendingUp,
      format: "currency",
      testId: "metric-monthly-revenue",
    },
    {
      title: "Eventos do Mês",
      value: metrics?.eventsThisMonth || 0,
      icon: Calendar,
      format: "number",
      testId: "metric-events-count",
    },
    {
      title: "Itens com Baixo Estoque",
      value: metrics?.lowStockItems || 0,
      icon: Package,
      format: "number",
      testId: "metric-low-stock",
    },
  ];

  // Recharts Pie Chart configuration for Quote status distribution
  const quotePieData = [
    { name: "Aprovados", value: metrics?.quoteSummary?.approvedQuotes || 0, color: "#10b981" },
    { name: "Pendentes/Enviados", value: metrics?.quoteSummary?.pendingQuotes || 0, color: "#3b82f6" },
    { name: "Rejeitados", value: metrics?.quoteSummary?.rejectedQuotes || 0, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Financial comparative chart data
  const financialChartData = [
    { name: "Receitas (Pago)", valor: metrics?.financialSummary?.totalReceivablePaid || 0, fill: "#10b981" },
    { name: "Receitas (Pendente)", valor: metrics?.financialSummary?.totalReceivablePending || 0, fill: "#3b82f6" },
    { name: "Despesas (Pago)", valor: metrics?.financialSummary?.totalPayablePaid || 0, fill: "#ef4444" },
    { name: "Despesas (Pendente)", valor: metrics?.financialSummary?.totalPayablePending || 0, fill: "#f97316" },
  ];

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#6C5584]">Dashboard</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Visão geral e indicadores das operações da Bolzoni Produções
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60 rounded-lg shadow-sm gap-1">
          <TabsTrigger value="geral" className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-[#6C5584] data-[state=active]:text-white transition-all">
            Geral
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-[#6C5584] data-[state=active]:text-white transition-all">
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="eventos" className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-[#6C5584] data-[state=active]:text-white transition-all">
            Eventos
          </TabsTrigger>
          <TabsTrigger value="orcamentos" className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-[#6C5584] data-[state=active]:text-white transition-all col-span-1">
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="estoque" className="py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-[#6C5584] data-[state=active]:text-white transition-all col-span-2 md:col-span-1">
            Estoque
          </TabsTrigger>
        </TabsList>

        {/* ==================== TABS CONTENT: GERAL ==================== */}
        <TabsContent value="geral" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
          <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
            {generalMetricCards.map((metric) => (
              <Card key={metric.title} className="border-none shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                  <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <metric.icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  {metricsLoading ? (
                    <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                  ) : (
                    <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-gray-800" data-testid={metric.testId}>
                      {metric.format === "currency"
                        ? formatCurrency(metric.value)
                        : metric.value}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold text-gray-850">Faturamento Mensal</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-48 md:h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metrics?.monthlyRevenueChart || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={80} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                        labelFormatter={(label) => `Mês: ${label}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="revenue" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold text-gray-850">Fluxo de Caixa (Últimos 7 dias)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-48 md:h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={metrics?.cashFlowChart || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={80} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Saldo"]}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        name="Saldo"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--chart-2))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg font-semibold text-gray-850">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {eventsLoading ? (
                <div className="space-y-3 md:space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 md:h-16 w-full" />
                  ))}
                </div>
              ) : upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {upcomingEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 md:pb-4 last:border-0 last:pb-0 gap-2"
                      data-testid={`event-${event.id}`}
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm md:text-base font-semibold text-foreground truncate">{event.title}</p>
                        <div className="flex flex-wrap items-center gap-1 md:gap-4 text-xs md:text-sm text-muted-foreground">
                          <span className="truncate">{event.clientName}</span>
                          <span className="hidden md:inline">•</span>
                          <span className="text-xs">{formatLocalDate(event.date, "dd/MM 'às' HH:mm")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm md:text-base font-bold font-mono text-foreground">
                            {formatCurrency(parseFloat(event.contractValue))}
                          </p>
                        </div>
                        {getStatusBadge(event.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs md:text-sm text-muted-foreground py-6 md:py-8">
                  Nenhum evento agendado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TABS CONTENT: FINANCEIRO ==================== */}
        <TabsContent value="financeiro" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
          <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  A Receber (Pendente)
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-emerald-600">
                    {formatCurrency(metrics?.financialSummary?.totalReceivablePending || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  A Pagar (Pendente)
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 md:h-5 md:w-5 text-red-600 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-red-600">
                    {formatCurrency(metrics?.financialSummary?.totalPayablePending || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Faturamento Recebido
                </CardTitle>
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-blue-600">
                    {formatCurrency(metrics?.financialSummary?.totalReceivablePaid || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Despesas Pagas
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 md:h-5 md:w-5 text-orange-600 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-orange-600">
                    {formatCurrency(metrics?.financialSummary?.totalPayablePaid || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:gap-6 lg:grid-cols-3">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-1">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold">Resumo do Faturamento</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 flex flex-col justify-center items-center h-[240px]">
                {metricsLoading ? (
                  <Skeleton className="h-32 w-32 rounded-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialChartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis width={60} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                        {financialChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-2">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-[#6C5584]" />
                  Últimas Transações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {metricsLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : metrics?.financialSummary?.recentTransactions && metrics.financialSummary.recentTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Descrição</th>
                          <th className="px-6 py-3 font-semibold">Vencimento</th>
                          <th className="px-6 py-3 font-semibold text-right">Valor</th>
                          <th className="px-6 py-3 font-semibold text-center">Tipo</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {metrics.financialSummary.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">{tx.description}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{formatLocalDate(tx.dueDate)}</td>
                            <td className="px-6 py-4 text-right font-mono font-semibold">
                              <span className={tx.type === 'receivable' ? 'text-emerald-600' : 'text-red-600'}>
                                {tx.type === 'receivable' ? '+' : '-'} {formatCurrency(parseFloat(tx.amount))}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant="outline" className={tx.type === 'receivable' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                {tx.type === 'receivable' ? 'Receita' : 'Despesa'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge className={tx.isPaid ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}>
                                {tx.isPaid ? 'Pago' : 'Pendente'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-xs md:text-sm text-muted-foreground py-12">Nenhuma transação recente encontrada.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TABS CONTENT: EVENTOS ==================== */}
        <TabsContent value="eventos" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
          <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total de Eventos
                </CardTitle>
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono">
                    {metrics?.eventSummary?.totalEvents || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Agendados
                </CardTitle>
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-blue-500">
                    {metrics?.eventSummary?.scheduledEvents || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Concluídos
                </CardTitle>
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-green-500">
                    {metrics?.eventSummary?.completedEvents || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cancelados
                </CardTitle>
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-red-500">
                    {metrics?.eventSummary?.cancelledEvents || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold">Eventos Criados (Últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-48 md:h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={metrics?.eventSummary?.eventsByMonthChart || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [value, "Quantidade de Eventos"]} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Eventos"
                        stroke="#6C5584"
                        strokeWidth={2}
                        dot={{ fill: "#6C5584" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold">Eventos Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {metricsLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : metrics?.eventSummary?.recentEvents && metrics.eventSummary.recentEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Título</th>
                          <th className="px-6 py-3 font-semibold">Data</th>
                          <th className="px-6 py-3 font-semibold text-right">Valor</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {metrics.eventSummary.recentEvents.map((evt) => (
                          <tr key={evt.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">{evt.title}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{formatLocalDate(evt.date, "dd/MM/yyyy HH:mm")}</td>
                            <td className="px-6 py-4 text-right font-mono font-semibold">
                              {formatCurrency(parseFloat(evt.contractValue))}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {getStatusBadge(evt.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-xs md:text-sm text-muted-foreground py-12">Nenhum evento recente encontrado.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TABS CONTENT: ORÇAMENTOS ==================== */}
        <TabsContent value="orcamentos" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
          <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total de Orçamentos
                </CardTitle>
                <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono">
                    {metrics?.quoteSummary?.totalQuotes || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Aprovados (Convertidos)
                </CardTitle>
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-emerald-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-emerald-500">
                    {metrics?.quoteSummary?.approvedQuotes || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Em Negociação / Rascunho
                </CardTitle>
                <ListTodo className="h-4 w-4 md:h-5 md:w-5 text-blue-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-blue-500">
                    {metrics?.quoteSummary?.pendingQuotes || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Taxa de Conversão
                </CardTitle>
                <Percent className="h-4 w-4 md:h-5 md:w-5 text-amber-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-amber-500">
                    {metrics?.quoteSummary?.conversionRate || 0}%
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:gap-6 lg:grid-cols-3">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-1">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold">Conversão de Propostas</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 flex flex-col justify-center items-center h-[240px]">
                {metricsLoading ? (
                  <Skeleton className="h-32 w-32 rounded-full" />
                ) : quotePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quotePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {quotePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">Sem dados de orçamentos cadastrados.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-2">
              <CardHeader className="p-3 md:p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-base md:text-lg font-semibold">Orçamentos Recentes</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Total Estimado: <strong className="font-semibold text-gray-700">{formatCurrency(metrics?.quoteSummary?.totalQuotesValue || 0)}</strong>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {metricsLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : metrics?.quoteSummary?.recentQuotes && metrics.quoteSummary.recentQuotes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Cliente</th>
                          <th className="px-6 py-3 font-semibold">Tipo</th>
                          <th className="px-6 py-3 font-semibold text-right">Valor Estimado</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {metrics.quoteSummary.recentQuotes.map((q) => (
                          <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">{q.clientName}</td>
                            <td className="px-6 py-4 text-xs text-gray-500 capitalize">{q.eventType === '15anos' ? '15 Anos' : q.eventType}</td>
                            <td className="px-6 py-4 text-right font-mono font-semibold">
                              {formatCurrency(parseFloat(q.totalValue))}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {getQuoteStatusBadge(q.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-xs md:text-sm text-muted-foreground py-12">Nenhum orçamento recente encontrado.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TABS CONTENT: ESTOQUE ==================== */}
        <TabsContent value="estoque" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
          <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-3">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total de Itens Cadastrados
                </CardTitle>
                <Package className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono">
                    {metrics?.inventorySummary?.totalItems || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Alertas Críticos
                </CardTitle>
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-500 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-red-500">
                    {metrics?.inventorySummary?.lowStockItemsCount || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Valor Estimado do Estoque
                </CardTitle>
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {metricsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl lg:text-3xl font-bold font-mono text-emerald-600">
                    {formatCurrency(metrics?.inventorySummary?.totalStockValue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Níveis de Estoque Críticos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 space-y-4">
                {metricsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-2.5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.inventorySummary?.lowStockItemsList && metrics.inventorySummary.lowStockItemsList.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.inventorySummary.lowStockItemsList.map((item) => {
                      const percentage = item.minQuantity > 0 ? Math.min(Math.round((item.quantity / item.minQuantity) * 100), 100) : 0;
                      return (
                        <div key={item.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-800 font-semibold">{item.name}</span>
                            <span className="text-red-650 font-semibold font-mono">
                              {item.quantity} / {item.minQuantity} {item.unit || "un"}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2 bg-red-100 [&>div]:bg-red-500" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-xs md:text-sm text-muted-foreground py-12">Nenhum alerta crítico de estoque. Bom trabalho!</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-[#6C5584]" />
                  Movimentações Recentes de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {metricsLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : metrics?.inventorySummary?.recentMovements && metrics.inventorySummary.recentMovements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Item</th>
                          <th className="px-6 py-3 font-semibold text-center">Tipo</th>
                          <th className="px-6 py-3 font-semibold text-right">Qtd</th>
                          <th className="px-6 py-3 font-semibold">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {metrics.inventorySummary.recentMovements.map((mov) => (
                          <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[150px]">{mov.itemName}</td>
                            <td className="px-6 py-4 text-center">
                              <Badge className={mov.type === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}>
                                {mov.type === 'entrada' ? 'Entrada' : 'Saída'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-semibold">{mov.quantity}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{formatLocalDate(mov.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-xs md:text-sm text-muted-foreground py-12">Nenhuma movimentação de estoque recente.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
