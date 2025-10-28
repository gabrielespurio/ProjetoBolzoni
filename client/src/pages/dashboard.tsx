import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Calendar, Package, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/dashboard/upcoming-events"],
  });

  const metricCards = [
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
    };
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das operações da Bolzoni Produções
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.title} className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-3xl font-bold font-mono" data-testid={metric.testId}>
                  {metric.format === "currency"
                    ? formatCurrency(metric.value)
                    : metric.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics?.monthlyRevenueChart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={metrics?.cashFlowChart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
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

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Próximos Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                  data-testid={`event-${event.id}`}
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">{event.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{event.clientName}</span>
                      <span>•</span>
                      <span>{format(new Date(event.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-base font-bold font-mono text-foreground">
                        {formatCurrency(parseFloat(event.contractValue))}
                      </p>
                    </div>
                    {getStatusBadge(event.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum evento agendado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
