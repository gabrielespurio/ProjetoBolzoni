import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { FinancialDialog } from "@/components/financial-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialTransaction } from "@shared/schema";

export default function Financial() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

  const { data: transactions, isLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial/transactions"],
  });

  const filteredTransactions = transactions?.filter((transaction) =>
    transaction.description.toLowerCase().includes(search.toLowerCase())
  );

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Controle de contas a pagar e receber
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-transaction">
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo
            </CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="metric-balance">
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recebido - Pago
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              A Receber
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="metric-receivable">
              {formatCurrency(summary.receivable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recebido: {formatCurrency(summary.received)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              A Pagar
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="metric-payable">
              {formatCurrency(summary.payable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pago: {formatCurrency(summary.paid)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-transactions"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleEdit(transaction)}
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{transaction.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {format(new Date(transaction.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                        {transaction.isPaid && transaction.paidDate && (
                          <> • Pago em: {format(new Date(transaction.paidDate), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-base font-bold font-mono ${transaction.type === 'receivable' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'receivable' ? '+' : '-'} {formatCurrency(parseFloat(transaction.amount))}
                        </p>
                      </div>
                      <Badge variant={transaction.isPaid ? "secondary" : "default"}>
                        {transaction.isPaid ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhuma transação encontrada" : "Nenhuma transação cadastrada"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <FinancialDialog
        open={isDialogOpen}
        onClose={handleClose}
        transaction={selectedTransaction}
      />
    </div>
  );
}
