import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEmployeeSchema, type Employee, type EmployeePayment, type EmployeeRole, type Skill } from "@shared/schema";
import { z } from "zod";
import { useEffect, useState } from "react";
import { maskCPF, maskRG, maskCEP, maskPhone } from "@/lib/masks";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useViaCep } from "@/hooks/use-viacep";
import { Loader2, Plus, Trash2, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentDialog } from "./payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const employeeFormSchema = insertEmployeeSchema.extend({
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  numero: z.string().optional(),
  userEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  userPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
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
  const { fetchAddress, isLoading: isLoadingCep } = useViaCep();
  const [activeTab, setActiveTab] = useState("personal");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false);

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name || "",
      role: employee?.role || "",
      phone: employee?.phone || "",
      email: employee?.email || "",
      cpf: employee?.cpf || "",
      rg: employee?.rg || "",
      cep: employee?.cep || "",
      rua: employee?.rua || "",
      bairro: employee?.bairro || "",
      cidade: employee?.cidade || "",
      estado: employee?.estado || "",
      numero: employee?.numero || "",
      isAvailable: employee?.isAvailable ?? true,
      userEmail: "",
      userPassword: "",
    },
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery<EmployeePayment[]>({
    queryKey: ["/api/employees", employee?.id, "payments"],
    enabled: isEdit && activeTab === "payments",
  });

  const { data: employeeRoles, isLoading: isLoadingRoles } = useQuery<EmployeeRole[]>({
    queryKey: ["/api/settings/employee-roles"],
  });

  const { data: allSkills, isLoading: isLoadingSkills } = useQuery<Skill[]>({
    queryKey: ["/api/settings/skills"],
  });

  const { data: employeeSkillsData } = useQuery<{ skillId: string }[]>({
    queryKey: ["/api/employees", employee?.id, "skills"],
    enabled: isEdit && !!employee?.id,
  });

  const handleCepBlur = async () => {
    const cep = form.getValues("cep");
    if (cep && cep.replace(/\D/g, "").length === 8) {
      const data = await fetchAddress(cep);
      if (data) {
        form.setValue("rua", data.rua);
        form.setValue("bairro", data.bairro);
        form.setValue("cidade", data.cidade);
        form.setValue("estado", data.estado);
      }
    }
  };

  useEffect(() => {
    if (open && employee) {
      form.reset({
        name: employee.name || "",
        role: employee.role || "",
        phone: employee.phone || "",
        email: employee.email || "",
        cpf: employee.cpf || "",
        rg: employee.rg || "",
        cep: employee.cep || "",
        rua: employee.rua || "",
        bairro: employee.bairro || "",
        cidade: employee.cidade || "",
        estado: employee.estado || "",
        numero: employee.numero || "",
        isAvailable: employee.isAvailable ?? true,
        userEmail: "",
        userPassword: "",
      });
    } else if (open && !employee) {
      form.reset({
        name: "",
        role: "",
        phone: "",
        email: "",
        cpf: "",
        rg: "",
        cep: "",
        rua: "",
        bairro: "",
        cidade: "",
        estado: "",
        numero: "",
        isAvailable: true,
        userEmail: "",
        userPassword: "",
      });
    }
    if (open) {
      setActiveTab("personal");
      // Reset skills when opening for new employee
      if (!employee) {
        setSelectedSkillIds([]);
      }
    } else {
      // Reset when closing
      setSelectedSkillIds([]);
    }
  }, [open, employee, form]);

  useEffect(() => {
    if (open && employee && employeeSkillsData) {
      setSelectedSkillIds(employeeSkillsData.map(es => es.skillId));
    }
  }, [open, employee, employeeSkillsData]);

  const skillsMutation = useMutation({
    mutationFn: async ({ employeeId, skillIds }: { employeeId: string; skillIds: string[] }) => {
      return apiRequest("PUT", `/api/employees/${employeeId}/skills`, { skillIds });
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
    onSuccess: async (employeeData) => {
      const employeeId = isEdit ? employee!.id : employeeData.id;
      
      // Save skills
      if (employeeId) {
        await skillsMutation.mutateAsync({ employeeId, skillIds: selectedSkillIds });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "skills"] });
      toast({
        title: isEdit ? "Funcionário atualizado" : "Funcionário criado",
        description: isEdit ? "Funcionário atualizado com sucesso." : "Novo funcionário cadastrado com sucesso.",
      });
      onClose();
      form.reset();
      setSelectedSkillIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o funcionário.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiRequest("DELETE", `/api/employee-payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employee?.id, "payments"] });
      toast({
        title: "Pagamento excluído",
        description: "Pagamento excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir o pagamento.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeForm) => {
    mutation.mutate(data);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (confirm("Tem certeza que deseja excluir este pagamento?")) {
      deleteMutation.mutate(paymentId);
    }
  };

  const handleClose = () => {
    form.reset();
    setActiveTab("personal");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações do funcionário" : "Cadastre um novo funcionário"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" data-testid="tab-personal">Informações Pessoais</TabsTrigger>
            <TabsTrigger value="access" data-testid="tab-access">Informações de Acesso</TabsTrigger>
            <TabsTrigger value="payments" disabled={!isEdit} data-testid="tab-payments">Dados de Pagamentos</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-280px)] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TabsContent value="personal" className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Informações Básicas</h3>
                    <div className="grid gap-4 md:grid-cols-2">
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-employee-role">
                                  <SelectValue placeholder={isLoadingRoles ? "Carregando..." : "Selecione uma função"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employeeRoles && employeeRoles.length > 0 ? (
                                  employeeRoles.map((role) => (
                                    <SelectItem key={role.id} value={role.name} data-testid={`role-option-${role.id}`}>
                                      {role.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    Nenhuma função cadastrada
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Habilidades
                      </label>
                      <Popover open={skillsPopoverOpen} onOpenChange={setSkillsPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-select-skills"
                          >
                            {selectedSkillIds.length > 0 ? (
                              <span className="text-muted-foreground">
                                {selectedSkillIds.length} habilidade(s) selecionada(s)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {isLoadingSkills ? "Carregando..." : "Selecione as habilidades"}
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="p-2">
                            <p className="text-sm text-muted-foreground mb-2">
                              Selecione as habilidades do funcionário
                            </p>
                            <ScrollArea className="h-48">
                              <div className="space-y-1">
                                {allSkills && allSkills.length > 0 ? (
                                  allSkills.map((skill) => (
                                    <div
                                      key={skill.id}
                                      className="flex items-center space-x-2 p-2 rounded-md hover-elevate cursor-pointer"
                                      onClick={() => {
                                        if (selectedSkillIds.includes(skill.id)) {
                                          setSelectedSkillIds(selectedSkillIds.filter(id => id !== skill.id));
                                        } else {
                                          setSelectedSkillIds([...selectedSkillIds, skill.id]);
                                        }
                                      }}
                                      data-testid={`skill-option-${skill.id}`}
                                    >
                                      <Checkbox
                                        checked={selectedSkillIds.includes(skill.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedSkillIds([...selectedSkillIds, skill.id]);
                                          } else {
                                            setSelectedSkillIds(selectedSkillIds.filter(id => id !== skill.id));
                                          }
                                        }}
                                      />
                                      <span className="text-sm">{skill.name}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground p-2">
                                    Nenhuma habilidade cadastrada
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {selectedSkillIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedSkillIds.map((skillId) => {
                            const skill = allSkills?.find(s => s.id === skillId);
                            return skill ? (
                              <Badge
                                key={skillId}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => setSelectedSkillIds(selectedSkillIds.filter(id => id !== skillId))}
                                data-testid={`badge-skill-${skillId}`}
                              >
                                {skill.name}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="000.000.000-00" 
                                data-testid="input-employee-cpf"
                                onChange={(e) => field.onChange(maskCPF(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RG</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="00.000.000-0" 
                                data-testid="input-employee-rg"
                                onChange={(e) => field.onChange(maskRG(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Contato</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="(00) 00000-0000" 
                                data-testid="input-employee-phone"
                                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                              />
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
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Endereço</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="cep"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    placeholder="00000-000" 
                                    data-testid="input-employee-cep"
                                    onBlur={handleCepBlur}
                                    maxLength={9}
                                    onChange={(e) => field.onChange(maskCEP(e.target.value))}
                                  />
                                  {isLoadingCep && (
                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="estado"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="UF" data-testid="input-employee-estado" maxLength={2} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cidade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Cidade" data-testid="input-employee-cidade" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="bairro"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Bairro" data-testid="input-employee-bairro" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 grid-cols-2">
                          <FormField
                            control={form.control}
                            name="rua"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rua</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Rua" data-testid="input-employee-rua" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="numero"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Nº" data-testid="input-employee-numero" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
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
                </TabsContent>

                <TabsContent value="access" className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Credenciais de Acesso</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure o email e senha para que o funcionário possa acessar o sistema.
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="userEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de Acesso</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="email@exemplo.com" data-testid="input-user-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="userPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Mínimo 6 caracteres" data-testid="input-user-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">Histórico de Pagamentos</h3>
                        <p className="text-sm text-muted-foreground">
                          Registros de todos os pagamentos realizados a este funcionário
                        </p>
                      </div>
                      <Button type="button" size="sm" onClick={() => setPaymentDialogOpen(true)} data-testid="button-add-payment">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Pagamento
                      </Button>
                    </div>

                    {isLoadingPayments ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : payments && payments.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>{payment.description || "-"}</TableCell>
                                <TableCell className="text-right">
                                  R$ {parseFloat(payment.amount).toFixed(2).replace(".", ",")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePayment(payment.id)}
                                    data-testid={`button-delete-payment-${payment.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md bg-muted/30">
                        <p className="text-sm text-muted-foreground">Nenhum pagamento registrado</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Clique em "Adicionar Pagamento" para registrar um novo pagamento
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <div className="flex justify-end gap-4 pt-4 border-t">
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
      {employee && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          employeeId={employee.id}
        />
      )}
    </Dialog>
  );
}
