import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEmployeeSchema, type Employee } from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const employeeFormSchema = insertEmployeeSchema.extend({
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type EmployeeForm = z.infer<typeof employeeFormSchema>;

interface EmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

export function EmployeeDialog({ open, onClose, employee }: EmployeeDialogProps) {
  const { toast } = useToast();
  const isEdit = !!employee;

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name || "",
      role: employee?.role || "",
      phone: employee?.phone || "",
      email: employee?.email || "",
      isAvailable: employee?.isAvailable ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EmployeeForm) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/employees/${employee.id}`, data);
      } else {
        return apiRequest("POST", "/api/employees", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: isEdit ? "Funcionário atualizado" : "Funcionário criado",
        description: isEdit ? "Funcionário atualizado com sucesso." : "Novo funcionário cadastrado com sucesso.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o funcionário.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeForm) => {
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
          <DialogTitle>{isEdit ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações do funcionário" : "Cadastre um novo funcionário"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do funcionário" data-testid="input-employee-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Recreador, Caracterista" data-testid="input-employee-role" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(00) 00000-0000" data-testid="input-employee-phone" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@exemplo.com" data-testid="input-employee-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Disponível</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Funcionário está disponível para eventos
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-employee-available"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-employee">
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
