import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertFinancialTransactionSchema, type FinancialTransaction } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const financialFormSchema = insertFinancialTransactionSchema.extend({
  notes: z.string().optional(),
  eventId: z.string().optional().or(z.literal("")),
  paidDate: z.string().optional().or(z.literal("")),
});

type FinancialForm = z.infer<typeof financialFormSchema>;

interface FinancialDialogProps {
  open: boolean;
  onClose: () => void;
  transaction?: FinancialTransaction | null;
}

export function FinancialDialog({ open, onClose, transaction }: FinancialDialogProps) {
  const { toast } = useToast();
  const isEdit = !!transaction;

  const form = useForm<FinancialForm>({
    resolver: zodResolver(financialFormSchema),
    defaultValues: {
      type: transaction?.type || "receivable",
      description: transaction?.description || "",
      amount: transaction?.amount || "0",
      dueDate: transaction?.dueDate ? new Date(transaction.dueDate).toISOString().slice(0, 10) : "",
      paidDate: transaction?.paidDate ? new Date(transaction.paidDate).toISOString().slice(0, 10) : "",
      isPaid: transaction?.isPaid || false,
      notes: transaction?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FinancialForm) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/financial/transactions/${transaction.id}`, data);
      } else {
        return apiRequest("POST", "/api/financial/transactions", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: isEdit ? "Transação atualizada" : "Transação criada",
        description: isEdit ? "Transação atualizada com sucesso." : "Nova transação cadastrada com sucesso.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a transação.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FinancialForm) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações da transação" : "Cadastre uma nova transação financeira"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="receivable">A Receber</SelectItem>
                        <SelectItem value="payable">A Pagar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-transaction-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Descrição da transação" data-testid="input-transaction-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-transaction-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-transaction-paid-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Pago</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Marque se a transação já foi paga/recebida
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-transaction-paid"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Informações adicionais" rows={3} data-testid="input-transaction-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-transaction">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
