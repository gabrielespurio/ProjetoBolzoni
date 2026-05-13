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
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    AlertCircle,
    FileEdit,
} from "lucide-react";
import type { TimeRecord } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type UserRole = "admin" | "employee" | "secretaria";

interface TimeSummary {
    workloadHours: number;
    today: { workedMinutes: number; expectedMinutes: number; balanceMinutes: number };
    week: { workedMinutes: number; expectedMinutes: number; balanceMinutes: number };
    month: { workedMinutes: number; expectedMinutes: number; balanceMinutes: number };
}

interface TimeStatus {
    isClockedIn: boolean;
    latestRecord: TimeRecord | null;
}

function formatMinutes(totalMinutes: number, showPlusSign = false): string {
    const isNegative = totalMinutes < 0;
    const hrs = Math.floor(Math.abs(totalMinutes) / 60);
    const mins = Math.floor(Math.abs(totalMinutes) % 60);
    const sign = isNegative ? "-" : (showPlusSign && totalMinutes > 0 ? "+" : "");
    return `${sign}${hrs}h${mins.toString().padStart(2, "0")}m`;
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
    const [myPage, setMyPage] = useState(0);
    const [allPage, setAllPage] = useState(0);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<"clock_in" | "clock_out">("clock_in");
    const [adjustmentDate, setAdjustmentDate] = useState("");
    const [adjustmentTime, setAdjustmentTime] = useState("");
    const [adjustmentReason, setAdjustmentReason] = useState("");
    
    const PAGE_SIZE = 50;

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};
    const userRole = (user?.role || "employee") as UserRole;
    const isAdmin = userRole === "admin";

    // Live clock
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Force refetch on mount to clear any stuck cache
    useEffect(() => {
        if (isAdmin) {
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/all"] });
        }
    }, [isAdmin]);

    // Queries
    const { data: status, isLoading: statusLoading } = useQuery<TimeStatus>({
        queryKey: ["/api/time-records/status"],
        refetchInterval: 30000,
    });

    const { data: summary, isLoading: summaryLoading } = useQuery<TimeSummary>({
        queryKey: ["/api/time-records/summary", selectedUserId],
        queryFn: async () => {
            const url = selectedUserId 
                ? `/api/time-records/summary?userId=${selectedUserId}`
                : `/api/time-records/summary`;
            return await apiRequest("GET", url);
        },
        refetchInterval: 60000,
    });

    const { data: recordsData, isLoading: recordsLoading } = useQuery<{ records: TimeRecord[], total: number } | TimeRecord[]>({
        queryKey: ["/api/time-records", myPage],
        queryFn: async () => {
            return await apiRequest("GET", `/api/time-records?limit=${PAGE_SIZE}&offset=${myPage * PAGE_SIZE}`);
        }
    });

    // Safely handle both new paginated format {records, total} and old format [records]
    const myRecords = Array.isArray(recordsData)
        ? recordsData
        : (recordsData?.records || []);
        
    const myTotal = Array.isArray(recordsData)
        ? recordsData.length
        : (recordsData?.total || 0);

    const { data: allRecordsData, isLoading: allRecordsLoading } = useQuery<any>({
        queryKey: ["/api/time-records/all-v2", allPage, selectedUserId],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append("limit", PAGE_SIZE.toString());
            params.append("offset", (allPage * PAGE_SIZE).toString());
            if (selectedUserId) params.append("userId", selectedUserId);
            return await apiRequest("GET", `/api/time-records/all?${params.toString()}`);
        },
        enabled: isAdmin,
    });

    // Safely handle both new paginated format {records, total} and old format [records]
    const allRecords = Array.isArray(allRecordsData) 
        ? allRecordsData 
        : (allRecordsData?.records || []);
    
    const allTotal = Array.isArray(allRecordsData)
        ? allRecordsData.length
        : (allRecordsData?.total || 0);

    const { data: allUsers } = useQuery<any[]>({
        queryKey: ["/api/employees"],
        enabled: isAdmin,
    });

    const { data: adjustments, isLoading: adjustmentsLoading } = useQuery<any[]>({
        queryKey: ["/api/time-records/adjustments"],
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

    const createAdjustmentMutation = useMutation({
        mutationFn: async (data: { type: "clock_in" | "clock_out", timestamp: string, reason: string }) => {
            return await apiRequest("POST", "/api/time-records/adjustments", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/adjustments"] });
            toast({
                title: "Ajuste solicitado",
                description: "Sua solicitação de ajuste foi enviada para aprovação.",
            });
            setIsAdjustmentModalOpen(false);
            setAdjustmentDate("");
            setAdjustmentTime("");
            setAdjustmentReason("");
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao solicitar ajuste",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateAdjustmentStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: "approved" | "rejected" }) => {
            return await apiRequest("PATCH", `/api/time-records/adjustments/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/adjustments"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-records/summary"] });
            if (isAdmin) queryClient.invalidateQueries({ queryKey: ["/api/time-records/all"] });
            toast({
                title: "Status atualizado",
                description: "O status da solicitação de ajuste foi atualizado.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar status",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const isClockedIn = status?.isClockedIn ?? false;

    const handleClock = () => {
        clockMutation.mutate(isClockedIn ? "clock_out" : "clock_in");
    };

    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustmentDate || !adjustmentTime || !adjustmentReason) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha todos os campos para solicitar o ajuste.",
                variant: "destructive",
            });
            return;
        }
        
        // Combine date and time
        const datetimeString = `${adjustmentDate}T${adjustmentTime}:00`;
        createAdjustmentMutation.mutate({
            type: adjustmentType,
            timestamp: datetimeString,
            reason: adjustmentReason,
        });
    };

    // Group records for display
    const myDayGroups = useMemo(() => groupByDay(myRecords), [myRecords]);
    const allDayGroups = useMemo(() => groupByDay(allRecords), [allRecords]);

    // Get employees for the filter
    const filterUsers = useMemo(() => {
        if (!allUsers) return [];
        return allUsers
            .filter((u) => u.userId)
            .map((u) => ({ id: u.userId, name: u.name }));
    }, [allUsers]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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

                {/* Balance */}
                {(() => {
                    const balance = summary?.month.balanceMinutes || 0;
                    const isPositive = balance >= 0;
                    
                    return (
                        <Card className={`border-card-border ${isPositive ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'}`}>
                            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
                                <CardTitle className={`text-xs md:text-sm font-medium flex items-center gap-2 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    Saldo de Horas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                                {summaryLoading ? (
                                    <Skeleton className="h-10 w-32" />
                                ) : (
                                    <div className={`text-2xl md:text-3xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatMinutes(balance, true)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })()}
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
                            <div className="flex flex-wrap items-center gap-2">
                                <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8">
                                            <FileEdit className="h-4 w-4 mr-1" />
                                            Solicitar Ajuste
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Solicitar Ajuste de Ponto</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleAdjustmentSubmit} className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Tipo de Registro</Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={adjustmentType === "clock_in" ? "default" : "outline"}
                                                        onClick={() => setAdjustmentType("clock_in")}
                                                        className="flex-1"
                                                    >
                                                        <LogIn className="w-4 h-4 mr-2" />
                                                        Entrada
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={adjustmentType === "clock_out" ? "default" : "outline"}
                                                        onClick={() => setAdjustmentType("clock_out")}
                                                        className="flex-1"
                                                    >
                                                        <LogOut className="w-4 h-4 mr-2" />
                                                        Saída
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="adj-date">Data</Label>
                                                    <Input
                                                        id="adj-date"
                                                        type="date"
                                                        value={adjustmentDate}
                                                        onChange={(e) => setAdjustmentDate(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="adj-time">Hora</Label>
                                                    <Input
                                                        id="adj-time"
                                                        type="time"
                                                        value={adjustmentTime}
                                                        onChange={(e) => setAdjustmentTime(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="adj-reason">Motivo</Label>
                                                <Textarea
                                                    id="adj-reason"
                                                    placeholder="Descreva o motivo do ajuste (ex: esqueci de bater o ponto, sistema fora do ar...)"
                                                    value={adjustmentReason}
                                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <Button type="submit" className="w-full" disabled={createAdjustmentMutation.isPending}>
                                                {createAdjustmentMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                                
                                <TabsList>
                                    <TabsTrigger value="my-records" className="text-xs md:text-sm">
                                        <UserIcon className="h-4 w-4 mr-1" />
                                        Meu Ponto
                                    </TabsTrigger>
                                    <TabsTrigger value="adjustments" className="text-xs md:text-sm">
                                        <AlertCircle className="h-4 w-4 mr-1" />
                                        Ajustes {adjustments?.filter((a: any) => a.status === 'pending').length ? `(${adjustments.filter((a: any) => a.status === 'pending').length})` : ''}
                                    </TabsTrigger>
                                    {isAdmin && (
                                        <TabsTrigger value="all-records" className="text-xs md:text-sm">
                                            <Users className="h-4 w-4 mr-1" />
                                            Todos
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </div>
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
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] md:text-xs">
                                                        {formatMinutes(calculateDayHours(group.records))} trabalhadas
                                                    </Badge>
                                                    {summary && (
                                                        (() => {
                                                            const worked = calculateDayHours(group.records);
                                                            const expected = summary.workloadHours * 60;
                                                            const balance = worked - expected;
                                                            // Only show balance for weekdays (Mon-Fri)
                                                            const dayOfWeek = new Date(group.fullDate).getDay();
                                                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                                            
                                                            if (isWeekend && worked === 0) return null;

                                                            return (
                                                                <Badge 
                                                                    variant={balance >= 0 ? "default" : "destructive"} 
                                                                    className={`text-[10px] md:text-xs ${balance >= 0 ? "bg-green-500 hover:bg-green-600 border-none" : ""}`}
                                                                >
                                                                    {balance >= 0 ? "+" : "-"}{formatMinutes(balance)}
                                                                </Badge>
                                                            );
                                                        })()
                                                    )}
                                                </div>
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

                                    {/* Pagination Controls */}
                                    {myTotal > PAGE_SIZE && (
                                        <div className="p-4 flex items-center justify-between border-t border-border bg-muted/20">
                                            <p className="text-xs text-muted-foreground">
                                                Mostrando {myPage * PAGE_SIZE + 1} - {Math.min((myPage + 1) * PAGE_SIZE, myTotal)} de {myTotal} registros
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setMyPage(p => Math.max(0, p - 1))}
                                                    disabled={myPage === 0}
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                                    Anterior
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setMyPage(p => p + 1)}
                                                    disabled={(myPage + 1) * PAGE_SIZE >= myTotal}
                                                >
                                                    Próxima
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
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
                                        onValueChange={(v) => {
                                            setSelectedUserId(v === "all" ? null : v);
                                            setAllPage(0); // Reset page on filter change
                                        }}
                                    >
                                        <SelectTrigger className="w-full sm:w-[250px]">
                                            <SelectValue placeholder="Filtrar por funcionário" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os funcionários</SelectItem>
                                            {filterUsers.map((u) => (
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
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] md:text-xs">
                                                            {formatMinutes(calculateDayHours(group.records))} trabalhadas
                                                        </Badge>
                                                        {summary && (
                                                            (() => {
                                                                const worked = calculateDayHours(group.records);
                                                                const expected = summary.workloadHours * 60;
                                                                const balance = worked - expected;
                                                                const dayOfWeek = new Date(group.fullDate).getDay();
                                                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                                                
                                                                if (isWeekend && worked === 0) return null;

                                                                return (
                                                                    <Badge 
                                                                        variant={balance >= 0 ? "default" : "destructive"} 
                                                                        className={`text-[10px] md:text-xs ${balance >= 0 ? "bg-green-500 hover:bg-green-600 border-none" : ""}`}
                                                                    >
                                                                        {balance >= 0 ? "+" : "-"}{formatMinutes(balance)}
                                                                    </Badge>
                                                                );
                                                            })()
                                                        )}
                                                    </div>
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

                                        {/* Pagination Controls */}
                                        {allTotal > PAGE_SIZE && (
                                            <div className="p-4 flex items-center justify-between border-t border-border bg-muted/20">
                                                <p className="text-xs text-muted-foreground">
                                                    Mostrando {allPage * PAGE_SIZE + 1} - {Math.min((allPage + 1) * PAGE_SIZE, allTotal)} de {allTotal} registros
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setAllPage(p => Math.max(0, p - 1))}
                                                        disabled={allPage === 0}
                                                    >
                                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                                        Anterior
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setAllPage(p => p + 1)}
                                                        disabled={(allPage + 1) * PAGE_SIZE >= allTotal}
                                                    >
                                                        Próxima
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
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
                    {/* Adjustments Tab */}
                    <TabsContent value="adjustments" className="m-0">
                        <CardContent className="p-0">
                            {adjustmentsLoading ? (
                                <div className="space-y-3 p-3 md:p-6">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full" />
                                    ))}
                                </div>
                            ) : adjustments && adjustments.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {adjustments.map((adj: any) => (
                                        <div key={adj.id} className="p-3 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex gap-4">
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${adj.type === "clock_in"
                                                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                        }`}
                                                >
                                                    {adj.type === "clock_in" ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-foreground">
                                                            {adj.type === "clock_in" ? "Ajuste de Entrada" : "Ajuste de Saída"}
                                                        </h4>
                                                        {isAdmin && <Badge variant="secondary" className="text-[10px]">{adj.userName}</Badge>}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 mt-1">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatFullDate(adj.timestamp)} às {formatTime(adj.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm mt-2 font-medium">Motivo: <span className="font-normal text-muted-foreground">{adj.reason}</span></p>
                                                    
                                                    {adj.status !== "pending" && (
                                                        <p className="text-xs mt-2 text-muted-foreground">
                                                            Respondido em: {adj.reviewedAt ? new Date(adj.reviewedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <Badge 
                                                    variant={adj.status === "approved" ? "default" : adj.status === "rejected" ? "destructive" : "outline"}
                                                    className={adj.status === "approved" ? "bg-green-500 hover:bg-green-600 border-none" : adj.status === "pending" ? "text-yellow-600 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" : ""}
                                                >
                                                    {adj.status === "pending" && "Pendente"}
                                                    {adj.status === "approved" && "Aprovado"}
                                                    {adj.status === "rejected" && "Rejeitado"}
                                                </Badge>
                                                
                                                {isAdmin && adj.status === "pending" && (
                                                    <div className="flex gap-2 mt-2">
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-green-500 hover:bg-green-600 text-white h-8"
                                                            onClick={() => updateAdjustmentStatusMutation.mutate({ id: adj.id, status: "approved" })}
                                                            disabled={updateAdjustmentStatusMutation.isPending}
                                                        >
                                                            <Check className="h-4 w-4 mr-1" /> Aprovar
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive"
                                                            className="h-8"
                                                            onClick={() => updateAdjustmentStatusMutation.mutate({ id: adj.id, status: "rejected" })}
                                                            disabled={updateAdjustmentStatusMutation.isPending}
                                                        >
                                                            <X className="h-4 w-4 mr-1" /> Rejeitar
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 md:p-12 text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma solicitação de ajuste de ponto encontrada
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
