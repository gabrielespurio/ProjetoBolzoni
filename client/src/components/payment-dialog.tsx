import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEmployeePaymentSchema } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const paymentFormSchema = insertEmployeePaymentSchema.omit({ employeeId: true }).extend({
  amount: z.string().min(1, "Valor é obrigatório"),
  paymentDate: z.string().min(1, "Data é obrigatória"),
  description: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentFormSchema>;

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
}

export function PaymentDialog({ open, onClose, employeeId }: PaymentDialogProps) {
  const { toast } = useToast();

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PaymentForm) => {
      const paymentData = {
        amount: data.amount,
        paymentDate: data.paymentDate,
        description: data.description,
      };
      return apiRequest("POST", `/api/employees/${employeeId}/payments`, paymentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "payments"] });
      toast({
        title: "Pagamento registrado",
        description: "Pagamento adicionado com sucesso.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao registrar o pagamento.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentForm) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Pagamento</DialogTitle>
          <DialogDescription>
            Registre um novo pagamento para este funcionário
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      data-testid="input-payment-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Pagamento *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      data-testid="input-payment-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descrição do pagamento (opcional)"
                      data-testid="textarea-payment-description"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-payment"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-payment">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Pagamento
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
