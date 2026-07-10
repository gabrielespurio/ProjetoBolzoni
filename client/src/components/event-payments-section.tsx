import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, DollarSign, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
}

interface EventPaymentsSectionProps {
  payments: EventPayment[];
  onChange: (payments: EventPayment[]) => void;
  contractValue: string;
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

export function EventPaymentsSection({ payments, onChange, contractValue, isReadOnly = false }: EventPaymentsSectionProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPaid = useMemo(() => {
    return (payments || []).reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  }, [payments]);

  const contract = parseFloat(contractValue || "0");
  const remaining = Math.max(0, contract - totalPaid);
  const percentage = contract > 0 ? Math.min(100, (totalPaid / contract) * 100) : 0;
  const isFullyPaid = remaining <= 0 && contract > 0;

  const handleSubmit = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!amount || !paymentDate || !paymentMethod) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para registrar o pagamento.",
        variant: "destructive",
      });
      return;
    }
    const newPayment: EventPayment = {
      id: Math.random().toString(36).substring(7),
      amount,
      paymentDate,
      paymentMethod,
    };
    onChange([...(payments || []), newPayment]);
    setAmount("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("");
    setShowForm(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      onChange((payments || []).filter(p => p.id !== deleteId));
      setDeleteId(null);
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
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">
              Salvar Pagamento
            </Button>
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
          Nenhum pagamento registrado para este evento.
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
              onClick={handleDelete}
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
