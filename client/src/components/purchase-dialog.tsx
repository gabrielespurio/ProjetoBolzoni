import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPurchaseSchema, type Purchase, type InventoryItem } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const purchaseFormSchema = insertPurchaseSchema.extend({
  notes: z.string().optional(),
  itemId: z.string().optional().or(z.literal("")),
  quantity: z.number().int().positive("Quantidade deve ser maior que zero").optional(),
  purchaseDate: z.string(),
});

type PurchaseForm = z.infer<typeof purchaseFormSchema>;

interface PurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  purchase?: Purchase | null;
}

export function PurchaseDialog({ open, onClose, purchase }: PurchaseDialogProps) {
  const { toast } = useToast();
  const isEdit = !!purchase;

  const { data: items } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    enabled: open,
  });

  const form = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: purchase?.supplier || "",
      description: purchase?.description || "",
      amount: purchase?.amount || "0",
      itemId: purchase?.itemId || "",
      quantity: purchase?.quantity || undefined,
      purchaseDate: purchase?.purchaseDate ? new Date(purchase.purchaseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: purchase?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PurchaseForm) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/purchases/${purchase.id}`, data);
      } else {
        return apiRequest("POST", "/api/purchases", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      toast({
        title: isEdit ? "Compra atualizada" : "Compra registrada",
        description: isEdit ? "Compra atualizada com sucesso." : "Nova compra registrada com sucesso.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a compra.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseForm) => {
    // Parse date as local date (ignore timezone)
    const [year, month, day] = data.purchaseDate.split('-');
    const purchaseData = {
      ...data,
      purchaseDate: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
      itemId: data.itemId || undefined,
    };
    mutation.mutate(purchaseData as any);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Compra" : "Nova Compra"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações da compra" : "Registre uma nova compra"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do fornecedor" data-testid="input-purchase-supplier" />
                    </FormControl>
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
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-purchase-amount" />
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
                      <Input {...field} placeholder="Descrição da compra" data-testid="input-purchase-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Compra *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-purchase-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item do Estoque</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-purchase-item">
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("itemId") && (
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1"
                          value={field.value || ""} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Quantidade" 
                          data-testid="input-purchase-quantity" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Informações adicionais" rows={3} data-testid="input-purchase-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-purchase">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Atualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
