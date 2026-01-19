import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, Check, Trash2 } from "lucide-react";
import { FinancialDialog } from "@/components/financial-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialTransaction } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Financial() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: transactions, isLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial/transactions"],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return apiRequest("POST", `/api/financial/transactions/${transactionId}/pay`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      toast({
        title: "Baixa registrada",
        description: "Pagamento marcado como pago com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao dar baixa no pagamento.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/financial/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });
      setTransactionToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a transação.",
        variant: "destructive",
      });
    },
  });

  const filteredTransactions = useMemo(() => {
    let result = transactions || [];
    result = filterByDateRange(result, "dueDate", dateFilter);
    return result;
  }, [transactions, dateFilter]);

  const payableTransactions = filteredTransactions?.filter((t) => t.type === "payable") || [];
  const receivableTransactions = filteredTransactions?.filter((t) => t.type === "receivable") || [];

  const filteredPayable = payableTransactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReceivable = receivableTransactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(search.toLowerCase())
  );

  const summary = filteredTransactions?.reduce(
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

  const balance = summary.received - summary.paid;

  const handleEdit = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedTransaction(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedTransaction(null);
  };

  const handleMarkAsPaid = (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation();
    markAsPaidMutation.mutate(transactionId);
  };

  const handleDelete = (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation();
    setTransactionToDelete(transactionId);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteMutation.mutate(transactionToDelete);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const renderTransactionList = (transactionsList: FinancialTransaction[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3 md:space-y-4 p-3 md:p-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 md:h-20 w-full" />
          ))}
        </div>
      );
    }

    if (transactionsList.length === 0) {
      return (
        <div className="p-8 md:p-12 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            {search ? "Nenhuma transação encontrada" : emptyMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {transactionsList.map((transaction) => (
          <div
            key={transaction.id}
            className="p-3 md:p-6 hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => handleEdit(transaction)}
            data-testid={`transaction-${transaction.id}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-semibold text-foreground truncate">{transaction.description}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Venc: {format(new Date(transaction.dueDate), "dd/MM/yy", { locale: ptBR })}
                  {transaction.isPaid && transaction.paidDate && (
                    <span className="hidden sm:inline"> • Pago: {format(new Date(transaction.paidDate), "dd/MM/yy", { locale: ptBR })}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                <div className="text-left sm:text-right">
                  <p className={`text-sm md:text-base font-bold font-mono ${transaction.type === 'receivable' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {transaction.type === 'receivable' ? '+' : '-'} {formatCurrency(parseFloat(transaction.amount))}
                  </p>
                </div>
                {!transaction.isPaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleMarkAsPaid(e, transaction.id)}
                    disabled={markAsPaidMutation.isPending}
                    data-testid={`button-pay-${transaction.id}`}
                    className="text-xs"
                  >
                    <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Dar Baixa</span>
                    <span className="sm:hidden">Baixa</span>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDelete(e, transaction.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${transaction.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Badge 
                  variant={transaction.isPaid ? "outline" : "destructive"} 
                  className={transaction.isPaid ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700" : ""}
                  data-testid={`badge-${transaction.isPaid ? 'paid' : 'pending'}`}
                >
                  {transaction.isPaid && <Check className="mr-1 h-3 w-3" />}
                  {transaction.isPaid ? "Pago" : "Pendente"}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Financeiro</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Controle de contas a pagar e receber
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-transaction" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs sm:text-sm py-2">Visão Geral</TabsTrigger>
          <TabsTrigger value="receivable" data-testid="tab-receivable" className="text-xs sm:text-sm py-2">A Receber</TabsTrigger>
          <TabsTrigger value="payable" data-testid="tab-payable" className="text-xs sm:text-sm py-2">A Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <div className="grid gap-3 md:gap-6 grid-cols-1 sm:grid-cols-3">
            <Card className="border-card-border">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Saldo
                </CardTitle>
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold font-mono" data-testid="metric-balance">
                  {formatCurrency(balance)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Recebido - Pago
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  A Receber
                </CardTitle>
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold font-mono" data-testid="metric-receivable">
                  {formatCurrency(summary.receivable)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Recebido: {formatCurrency(summary.received)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  A Pagar
                </CardTitle>
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold font-mono" data-testid="metric-payable">
                  {formatCurrency(summary.payable)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Pago: {formatCurrency(summary.paid)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-card-border">
            <CardHeader className="border-b border-border p-3 md:p-6">
              <CardTitle className="text-sm md:text-base">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {renderTransactionList(
                (filteredTransactions || []).slice(0, 10),
                "Nenhuma transação cadastrada"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivable" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card className="border-card-border">
            <CardHeader className="border-b border-border p-3 md:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-receivable"
                  />
                </div>
                <DateFilter value={dateFilter} onChange={setDateFilter} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTransactionList(filteredReceivable, "Nenhuma conta a receber cadastrada")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card className="border-card-border">
            <CardHeader className="border-b border-border p-3 md:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-payable"
                  />
                </div>
                <DateFilter value={dateFilter} onChange={setDateFilter} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTransactionList(filteredPayable, "Nenhuma conta a pagar cadastrada")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FinancialDialog
        open={isDialogOpen}
        onClose={handleClose}
        transaction={selectedTransaction}
      />

      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação financeira do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
