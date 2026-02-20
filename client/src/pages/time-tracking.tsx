import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Clock,
    LogIn,
    LogOut,
    TrendingUp,
    TrendingDown,
    Calendar,
    CalendarDays,
    CalendarRange,
    Trash2,
    Timer,
    User as UserIcon,
    Users,
    Minus,
} from "lucide-react";
import type { TimeRecord } from "@shared/schema";

type UserRole = "admin" | "employee" | "secretaria";

interface TimeSummary {
    today: { workedMinutes: number; expectedMinutes: number; balanceMinutes: number };
    week: { workedMinutes: number; expectedMinutes: number; balanceMinutes: number };
    month: { workedMinutes: number; expectedMinutes: number; balanceMinutes: number };
}

interface TimeStatus {
    isClockedIn: boolean;
    latestRecord: TimeRecord | null;
}

function formatMinutes(totalMinutes: number): string {
    const hrs = Math.floor(Math.abs(totalMinutes) / 60);
    const mins = Math.abs(totalMinutes) % 60;
    return `${hrs}h${mins.toString().padStart(2, "0")}m`;
}

function formatTime(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatFullDate(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

// Group records by day
function groupByDay(records: any[]) {
    const groups: Record<string, any[]> = {};
    records.forEach((r) => {
        const key = new Date(r.timestamp).toLocaleDateString("pt-BR");
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });
    return Object.entries(groups).map(([date, recs]) => ({
        date,
        fullDate: recs[0].timestamp,
        records: recs.sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
    }));
}

// Calculate hours for a day's records
function calculateDayHours(records: any[]): number {
    const sorted = [...records].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let totalMinutes = 0;
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].type === "clock_in") {
            const clockOut = sorted.find((r: any, idx: number) => idx > i && r.type === "clock_out");
            if (clockOut) {
                const diff = new Date(clockOut.timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
                totalMinutes += diff / (1000 * 60);
            }
        }
    }
    return Math.round(totalMinutes);
}

export default function TimeTracking() {
    const { toast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("my-records");

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};
    const userRole = (user?.role || "employee") as UserRole;
    const isAdmin = userRole === "admin";

    // Live clock
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Queries
    const { data: status, isLoading: statusLoading } = useQuery<TimeStatus>({
        queryKey: ["/api/time-records/status"],
        refetchInterval: 30000,
    });

    const { data: summary, isLoading: summaryLoading } = useQuery<TimeSummary>({
        queryKey: ["/api/time-records/summary"],
        refetchInterval: 60000,
    });

    const { data: records, isLoading: recordsLoading } = useQuery<TimeRecord[]>({
        queryKey: ["/api/time-records"],
    });

    const { data: allRecords, isLoading: allRecordsLoading } = useQuery<
        (TimeRecord & { userName: string })[]
    >({
        queryKey: ["/api/time-records/all"],
        enabled: isAdmin,
    });

    const { data: allUsers } = useQuery<any[]>({
        queryKey: ["/api/employees"],
        enabled: isAdmin,
    });

    // Mutations
    const clockMutation = useMutation({
        mutationFn: async (type: "clock_in" | "clock_out") => {
            return await apiRequest("POST", "/api/time-records", { type });
        },
        onSuccess: (_, type) => {
            queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/summary"] });
            if (isAdmin) queryClient.invalidateQueries({ queryKey: ["/api/time-records/all"] });
            toast({
                title: type === "clock_in" ? "✅ Entrada registrada!" : "🔴 Saída registrada!",
                description: `Horário: ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao registrar ponto",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/time-records/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/summary"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/all"] });
            toast({
                title: "Registro removido",
                description: "O registro de ponto foi excluído com sucesso.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao remover registro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const isClockedIn = status?.isClockedIn ?? false;

    const handleClock = () => {
        clockMutation.mutate(isClockedIn ? "clock_out" : "clock_in");
    };

    // Group records for display
    const myDayGroups = useMemo(() => groupByDay(records || []), [records]);
    const allDayGroups = useMemo(() => {
        if (!allRecords) return [];
        const filtered = selectedUserId
            ? allRecords.filter((r) => r.userId === selectedUserId)
            : allRecords;
        return groupByDay(filtered);
    }, [allRecords, selectedUserId]);

    // Get unique users from records
    const uniqueUsers = useMemo(() => {
        if (!allRecords) return [];
        const map = new Map<string, string>();
        allRecords.forEach((r) => map.set(r.userId, r.userName));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [allRecords]);

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-semibold text-foreground">Departamento Pessoal</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                    Controle de ponto e jornada de trabalho
                </p>
            </div>

            {/* Clock-in/out Card */}
            <Card className="border-card-border overflow-hidden">
                <div className="relative">
                    <div
                        className={`absolute inset-0 opacity-10 transition-colors duration-500 ${isClockedIn
                            ? "bg-gradient-to-br from-green-500 to-emerald-600"
                            : "bg-gradient-to-br from-slate-400 to-slate-500"
                            }`}
                    />
                    <CardContent className="relative p-4 md:p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                            {/* Clock Display */}
                            <div className="text-center md:text-left">
                                <div className="text-4xl md:text-6xl font-bold text-foreground tracking-tight font-mono">
                                    {currentTime.toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {currentTime.toLocaleDateString("pt-BR", {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </p>

                                {/* Status */}
                                <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
                                    <div
                                        className={`w-3 h-3 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-slate-400"
                                            }`}
                                    />
                                    <span className="text-sm font-medium">
                                        {statusLoading ? (
                                            "Carregando..."
                                        ) : isClockedIn ? (
                                            <span className="text-green-600 dark:text-green-400">Em expediente</span>
                                        ) : (
                                            <span className="text-muted-foreground">Fora do expediente</span>
                                        )}
                                    </span>
                                </div>

                                {status?.latestRecord && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Último registro:{" "}
                                        {status.latestRecord.type === "clock_in" ? "Entrada" : "Saída"} às{" "}
                                        {formatTime(status.latestRecord.timestamp)}
                                    </p>
                                )}
                            </div>

                            {/* Clock Button */}
                            <Button
                                onClick={handleClock}
                                disabled={clockMutation.isPending}
                                size="lg"
                                className={`h-20 w-20 md:h-28 md:w-28 rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${isClockedIn
                                    ? "bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800"
                                    : "bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800"
                                    }`}
                                data-testid="button-clock"
                            >
                                <div className="flex flex-col items-center gap-1">
                                    {isClockedIn ? (
                                        <>
                                            <LogOut className="h-6 w-6 md:h-8 md:w-8" />
                                            <span className="text-[10px] md:text-xs font-semibold">SAÍDA</span>
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="h-6 w-6 md:h-8 md:w-8" />
                                            <span className="text-[10px] md:text-xs font-semibold">ENTRADA</span>
                                        </>
                                    )}
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {/* Today */}
                <Card className="border-card-border">
                    <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Horas Hoje
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        {summaryLoading ? (
                            <Skeleton className="h-10 w-32" />
                        ) : (
                            <>
                                <div className="text-2xl md:text-3xl font-bold">
                                    {formatMinutes(summary?.today.workedMinutes || 0)}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Week */}
                <Card className="border-card-border">
                    <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Horas Semana
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        {summaryLoading ? (
                            <Skeleton className="h-10 w-32" />
                        ) : (
                            <>
                                <div className="text-2xl md:text-3xl font-bold">
                                    {formatMinutes(summary?.week.workedMinutes || 0)}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Month */}
                <Card className="border-card-border">
                    <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CalendarRange className="h-4 w-4" />
                            Horas Mês
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        {summaryLoading ? (
                            <Skeleton className="h-10 w-32" />
                        ) : (
                            <>
                                <div className="text-2xl md:text-3xl font-bold">
                                    {formatMinutes(summary?.month.workedMinutes || 0)}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* History */}
            <Card className="border-card-border">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <CardHeader className="border-b border-border p-3 md:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Timer className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-base md:text-lg font-semibold">
                                    Histórico de Ponto
                                </CardTitle>
                            </div>
                            {isAdmin && (
                                <TabsList>
                                    <TabsTrigger value="my-records" className="text-xs md:text-sm">
                                        <UserIcon className="h-4 w-4 mr-1" />
                                        Meu Ponto
                                    </TabsTrigger>
                                    <TabsTrigger value="all-records" className="text-xs md:text-sm">
                                        <Users className="h-4 w-4 mr-1" />
                                        Todos
                                    </TabsTrigger>
                                </TabsList>
                            )}
                        </div>
                    </CardHeader>

                    {/* My Records Tab */}
                    <TabsContent value="my-records" className="m-0">
                        <CardContent className="p-0">
                            {recordsLoading ? (
                                <div className="space-y-3 p-3 md:p-6">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full" />
                                    ))}
                                </div>
                            ) : myDayGroups.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {myDayGroups.map((group) => (
                                        <div key={group.date} className="p-3 md:p-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-semibold text-foreground capitalize">
                                                    {formatFullDate(group.fullDate)}
                                                </h3>
                                                <Badge variant="outline" className="text-xs">
                                                    {formatMinutes(calculateDayHours(group.records))} trabalhadas
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {group.records.map((record: any) => (
                                                    <div
                                                        key={record.id}
                                                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                                                    >
                                                        <div
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center ${record.type === "clock_in"
                                                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                                }`}
                                                        >
                                                            {record.type === "clock_in" ? (
                                                                <LogIn className="h-4 w-4" />
                                                            ) : (
                                                                <LogOut className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="text-sm font-medium">
                                                                {record.type === "clock_in" ? "Entrada" : "Saída"}
                                                            </span>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatTime(record.timestamp)}
                                                            </p>
                                                        </div>
                                                        {record.notes && (
                                                            <span className="text-xs text-muted-foreground italic max-w-[150px] truncate">
                                                                {record.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 md:p-12 text-center">
                                    <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">
                                        Nenhum registro de ponto encontrado
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Clique no botão acima para registrar sua entrada
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </TabsContent>

                    {/* All Records Tab (Admin) */}
                    {isAdmin && (
                        <TabsContent value="all-records" className="m-0">
                            <CardContent className="p-0">
                                {/* User filter */}
                                <div className="p-3 md:p-6 pb-0 md:pb-0">
                                    <Select
                                        value={selectedUserId || "all"}
                                        onValueChange={(v) => setSelectedUserId(v === "all" ? null : v)}
                                    >
                                        <SelectTrigger className="w-full sm:w-[250px]">
                                            <SelectValue placeholder="Filtrar por funcionário" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os funcionários</SelectItem>
                                            {uniqueUsers.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {allRecordsLoading ? (
                                    <div className="space-y-3 p-3 md:p-6">
                                        {[...Array(3)].map((_, i) => (
                                            <Skeleton key={i} className="h-20 w-full" />
                                        ))}
                                    </div>
                                ) : allDayGroups.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {allDayGroups.map((group) => (
                                            <div key={group.date} className="p-3 md:p-6">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-sm font-semibold text-foreground capitalize">
                                                        {formatFullDate(group.fullDate)}
                                                    </h3>
                                                    <Badge variant="outline" className="text-xs">
                                                        {formatMinutes(calculateDayHours(group.records))} trabalhadas
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {group.records.map((record: any) => (
                                                        <div
                                                            key={record.id}
                                                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                                                        >
                                                            <div
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center ${record.type === "clock_in"
                                                                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                                    }`}
                                                            >
                                                                {record.type === "clock_in" ? (
                                                                    <LogIn className="h-4 w-4" />
                                                                ) : (
                                                                    <LogOut className="h-4 w-4" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium">
                                                                        {record.type === "clock_in" ? "Entrada" : "Saída"}
                                                                    </span>
                                                                    <Badge variant="secondary" className="text-[10px]">
                                                                        {record.userName}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatTime(record.timestamp)}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                                onClick={() => deleteMutation.mutate(record.id)}
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 md:p-12 text-center">
                                        <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">
                                            Nenhum registro de ponto encontrado
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </TabsContent>
                    )}
                </Tabs>
            </Card>
        </div>
    );
}
