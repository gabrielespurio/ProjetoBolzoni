import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertBuffetSchema, type Buffet, type InsertBuffet } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface BuffetDialogProps {
  open: boolean;
  onClose: () => void;
  buffet: Buffet | null;
}

export function BuffetDialog({ open, onClose, buffet }: BuffetDialogProps) {
  const { toast } = useToast();
  const form = useForm<InsertBuffet>({
    resolver: zodResolver(insertBuffetSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      responsibleName: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (buffet) {
      form.reset({
        name: buffet.name,
        address: buffet.address || "",
        phone: buffet.phone || "",
        email: buffet.email || "",
        responsibleName: buffet.responsibleName || "",
        notes: buffet.notes || "",
      });
    } else {
      form.reset({
        name: "",
        address: "",
        phone: "",
        email: "",
        responsibleName: "",
        notes: "",
      });
    }
  }, [buffet, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertBuffet) => {
      if (buffet) {
        return await apiRequest("PATCH", `/api/buffets/${buffet.id}`, data);
      }
      return await apiRequest("POST", "/api/buffets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buffets"] });
      toast({
        title: buffet ? "Buffet atualizado" : "Buffet criado",
        description: buffet
          ? "Os dados do buffet foram atualizados com sucesso."
          : "O novo buffet foi cadastrado com sucesso.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar buffet",
        description: error.message || "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{buffet ? "Editar Buffet" : "Novo Buffet"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Buffet</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-buffet-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsibleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-buffet-responsible" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-buffet-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" value={field.value || ""} data-testid="input-buffet-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-buffet-address" />
                  </FormControl>
                  <FormMessage />
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
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      className="resize-none"
                      data-testid="textarea-buffet-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-buffet"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-buffet"
              >
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
