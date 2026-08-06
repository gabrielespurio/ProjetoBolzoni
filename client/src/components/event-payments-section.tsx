import { useState, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, DollarSign, Calendar, CheckCircle2, AlertCircle, Clock, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export interface EventPayment {
  id?: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  requiresInvoice?: boolean;
  paymentTerm?: number | null;
}

interface EventPaymentsSectionProps {
  eventId?: string;
  payments: EventPayment[];
  onChange: (payments: EventPayment[]) => void;
  contractValue: string;
  ticketValue?: string;
  isReadOnly?: boolean;
}

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  cheque: "Cheque",
  outro: "Outro",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function EventPaymentsSection({ eventId, payments, onChange, contractValue, ticketValue = "0", isReadOnly = false }: EventPaymentsSectionProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [paymentTerm, setPaymentTerm] = useState<string>("30");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const entryValue = parseFloat(ticketValue || "0") || 0;
  const contract = parseFloat(contractValue || "0") || 0;

  const hasMatchingEntryInInstallments = useMemo(() => {
    return entryValue > 0 && (payments || []).some((p) => Math.abs(parseFloat(p.amount || "0") - entryValue) < 0.01);
  }, [payments, entryValue]);

  const totalPaid = useMemo(() => {
    const installmentsSum = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const isCoveredByInstallments = contract > 0 && installmentsSum >= contract - 0.01;
    return (hasMatchingEntryInInstallments || isCoveredByInstallments) ? installmentsSum : installmentsSum + entryValue;
  }, [payments, entryValue, contract, hasMatchingEntryInInstallments]);

  const remaining = Math.max(0, contract - totalPaid);
  const percentage = contract > 0 ? Math.min(100, (totalPaid / contract) * 100) : 0;
  const isFullyPaid = remaining <= 0.01 && contract > 0;

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!amount || !paymentDate || !paymentMethod) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para registrar o pagamento.",
        variant: "destructive",
      });
      return;
    }

    if (eventId) {
      try {
        setIsSaving(true);
        const savedPayment = await apiRequest("POST", `/api/events/${eventId}/payments`, {
          amount,
          paymentDate,
          paymentMethod,
          requiresInvoice,
          paymentTerm: requiresInvoice ? parseInt(paymentTerm) : null,
        });
        const newPayment: EventPayment = {
          id: savedPayment?.id,
          amount: savedPayment?.amount?.toString() || amount,
          paymentDate: savedPayment?.paymentDate ? new Date(savedPayment.paymentDate).toISOString().slice(0, 10) : paymentDate,
          paymentMethod: savedPayment?.paymentMethod || paymentMethod,
          requiresInvoice: savedPayment?.requiresInvoice || requiresInvoice,
          paymentTerm: savedPayment?.paymentTerm || (requiresInvoice ? parseInt(paymentTerm) : null),
        };
        onChange([...(payments || []), newPayment]);
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/payments`] });
        await queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
        await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/notifications/pending-payments"] });
        toast({
          title: "Pagamento salvo no evento!",
          description: "O pagamento foi registrado no banco de dados com sucesso.",
        });
      } catch (err: any) {
        toast({
          title: "Erro ao registrar pagamento",
          description: err.message || "Não foi possível registrar o pagamento.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    } else {
      const newPayment: EventPayment = {
        id: Math.random().toString(36).substring(7),
        amount,
        paymentDate,
        paymentMethod,
        requiresInvoice,
        paymentTerm: requiresInvoice ? parseInt(paymentTerm) : null,
      };
      onChange([...(payments || []), newPayment]);
    }

    setAmount("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("");
    setRequiresInvoice(false);
    setPaymentTerm("30");
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      if (eventId && !deleteId.includes(".")) {
        try {
          await apiRequest("DELETE", `/api/events/${eventId}/payments/${deleteId}`);
          await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/payments`] });
          await queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
          await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/notifications/pending-payments"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
        } catch (err: any) {
          toast({
            title: "Erro ao excluir pagamento",
            description: err.message || "Não foi possível remover do banco de dados.",
            variant: "destructive",
          });
          setDeleteId(null);
          return;
        }
      }
      onChange((payments || []).filter(p => p.id !== deleteId));
      setDeleteId(null);
      toast({
        title: "Pagamento excluído com sucesso!",
        description: "O pagamento e seu respectivo lançamento financeiro foram removidos.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-foreground">Pagamentos do Cliente</h3>
        </div>
        {!isReadOnly && !showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Registrar Pagamento
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <div className="flex items-center gap-2">
            {isFullyPaid ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Quitado
              </Badge>
            ) : totalPaid > 0 ? (
              <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                Parcial
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-400 bg-red-50 dark:bg-red-900/20 text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFullyPaid
                ? "bg-emerald-500"
                : percentage > 50
                ? "bg-amber-500"
                : percentage > 0
                ? "bg-orange-500"
                : "bg-muted-foreground/20"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contrato</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(contract)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recebido</p>
            <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Restante</p>
            <p className={`text-sm font-bold font-mono ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(remaining)}</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Método *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col justify-center">
              <div className="flex items-center space-x-2 mt-2">
                <Switch 
                  id="requires-invoice" 
                  checked={requiresInvoice}
                  onCheckedChange={setRequiresInvoice}
                />
                <Label htmlFor="requires-invoice" className="text-xs cursor-pointer">Emitir NF</Label>
              </div>
            </div>
            {requiresInvoice && (
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo de Pagamento *</Label>
                <Select value={paymentTerm} onValueChange={setPaymentTerm}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione o prazo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} size="sm" disabled={isSaving} className="text-xs bg-emerald-600 hover:bg-emerald-700">
              {isSaving ? "Salvando..." : "Salvar Pagamento"}
            </Button>
          </div>
        </div>
      )}

      {entryValue > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-950/20 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300">★</span>
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-semibold font-mono text-purple-600 dark:text-purple-300">
                  {formatCurrency(entryValue)}
                </span>
                <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
                  Entrada / Sinal
                </Badge>
                {hasMatchingEntryInInstallments && (
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px]">
                    Registrado em Pagamentos abaixo
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {hasMatchingEntryInInstallments
                  ? 'Valor informado na aba Informações (já contabilizado no lançamento de pagamento registrado abaixo)'
                  : 'Valor informado no campo "Entrada / Sinal" na aba Informações'}
              </div>
            </div>
          </div>
        </div>
      )}

      {payments && payments.length > 0 ? (
        <div className="space-y-2">
          {payments
            .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
            .map((payment, index) => (
            <div
              key={payment.id || index}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-600">{index + 1}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-mono text-emerald-600">
                      {formatCurrency(parseFloat(payment.amount))}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {(() => {
                      const d = new Date(payment.paymentDate);
                      const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                      return format(localDate, "dd/MM/yyyy", { locale: ptBR });
                    })()}
                  </div>
                  {payment.requiresInvoice && (
                    <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                      <Receipt className="h-3 w-3" />
                      NF solicitada (Prazo: {payment.paymentTerm} dias)
                    </div>
                  )}
                </div>
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                  onClick={() => setDeleteId(payment.id || null)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-muted-foreground">
          {entryValue > 0 ? "Nenhuma parcela adicional cadastrada." : "Nenhum pagamento registrado para este evento."}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pagamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsSaving(true);
                await handleDelete();
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
