import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertClientSchema, type Client } from "@shared/schema";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, User, Building2, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { maskCNPJ, maskCPF, maskRG, maskCEP, maskPhone } from "@/lib/masks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (val: number) => {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const eventStatusLabels: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300" },
  rescheduled: { label: "Reagendado", color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300" },
  in_progress: { label: "Em Andamento", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300" },
  completed: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300" },
  deleted: { label: "Excluído", color: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-950/40 dark:text-gray-300" },
  paid_entry: { label: "Entrada Paga", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" },
  paid_full: { label: "Total Pago", color: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300" },
};

const clientFormSchema = insertClientSchema.extend({
  personType: z.enum(["fisica", "juridica"]).default("fisica"),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cnpj: z.string().optional(),
  responsibleName: z.string().optional(),
  cargo: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  numero: z.string().optional(),
  profession: z.string().optional(),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientFormSchema>;

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  readOnly?: boolean;
}

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function ClientDialog({ open, onClose, client, readOnly = false }: ClientDialogProps) {
  const { toast } = useToast();
  const isEdit = !!client;
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  
  // Determine if user can edit based on role
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isReadOnly = readOnly || (userRole !== "admin" && isEdit);

  const { data: allEvents = [], isLoading: isLoadingEvents } = useQuery<any[]>({
    queryKey: ["/api/events"],
    enabled: open && isEdit && !!client?.id,
  });

  const clientEvents = useMemo(() => {
    if (!client?.id) return [];
    return allEvents.filter((e: any) => e.clientId === client.id);
  }, [allEvents, client]);

  const financialSummary = useMemo(() => {
    let totalContracted = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let pendingEventsCount = 0;

    clientEvents.forEach((ev: any) => {
      if (ev.status === "cancelled" || ev.status === "deleted") return;
      const contractVal = parseFloat(ev.contractValue || "0");
      const ticketVal = parseFloat(ev.ticketValue || "0");
      const installmentsList = ev.eventInstallments || [];
      const installmentsSum = installmentsList.reduce(
        (sum: number, inst: any) => sum + parseFloat(inst.amount || "0"),
        0
      );
      const hasMatchingEntry = ticketVal > 0 && installmentsList.some((inst: any) => Math.abs(parseFloat(inst.amount || "0") - ticketVal) < 0.01);
      const isCoveredByInstallments = contractVal > 0 && installmentsSum >= contractVal - 0.01;
      const paidVal = (hasMatchingEntry || isCoveredByInstallments) ? installmentsSum : installmentsSum + ticketVal;
      const pendingVal = Math.max(0, contractVal - paidVal);

      totalContracted += contractVal;
      totalReceived += paidVal;
      if (pendingVal > 0) {
        totalPending += pendingVal;
        pendingEventsCount++;
      }
    });

    return {
      totalContracted,
      totalReceived,
      totalPending,
      pendingEventsCount,
    };
  }, [clientEvents]);

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      personType: client?.personType || "fisica",
      name: client?.name || "",
      cnpj: client?.cnpj || "",
      responsibleName: client?.responsibleName || "",
      cargo: client?.cargo || "",
      phone: client?.phone || "",
      phone2: client?.phone2 || "",
      email: client?.email || "",
      cpf: client?.cpf || "",
      rg: client?.rg || "",
      cep: client?.cep || "",
      rua: client?.rua || "",
      bairro: client?.bairro || "",
      cidade: client?.cidade || "",
      estado: client?.estado || "",
      numero: client?.numero || "",
      profession: client?.profession || "",
      notes: client?.notes || "",
    },
  });

  const personType = form.watch("personType");

  // Clear document fields when person type changes
  useEffect(() => {
    if (personType === "juridica") {
      form.setValue("cpf", "");
      form.setValue("rg", "");
    } else if (personType === "fisica") {
      form.setValue("cnpj", "");
      form.setValue("responsibleName", "");
      form.setValue("cargo", "");
    }
  }, [personType, form]);

  // Reset form when dialog opens or client changes
  useEffect(() => {
    if (open) {
      setActiveTab("dados");
      form.reset({
        personType: client?.personType || "fisica",
        name: client?.name || "",
        cnpj: client?.cnpj || "",
        responsibleName: client?.responsibleName || "",
        cargo: client?.cargo || "",
        phone: client?.phone || "",
        phone2: client?.phone2 || "",
        email: client?.email || "",
        cpf: client?.cpf || "",
        rg: client?.rg || "",
        cep: client?.cep || "",
        rua: client?.rua || "",
        bairro: client?.bairro || "",
        cidade: client?.cidade || "",
        estado: client?.estado || "",
        numero: client?.numero || "",
        profession: client?.profession || "",
        notes: client?.notes || "",
      });
    }
  }, [open, client, form]);

  const mutation = useMutation({
    mutationFn: async (data: ClientForm) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/clients/${client.id}`, data);
      } else {
        return apiRequest("POST", "/api/clients", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: isEdit ? "Cliente atualizado" : "Cliente criado",
        description: isEdit ? "Cliente atualizado com sucesso." : "Novo cliente cadastrado com sucesso.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o cliente.",
        variant: "destructive",
      });
    },
  });

  const fetchAddressFromCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    
    if (cleanCEP.length !== 8) {
      return;
    }

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data: ViaCEPResponse = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado.",
          variant: "destructive",
        });
        return;
      }

      form.setValue("rua", data.logradouro);
      form.setValue("bairro", data.bairro);
      form.setValue("cidade", data.localidade);
      form.setValue("estado", data.uf);

      toast({
        title: "Endereço encontrado",
        description: "Os dados do endereço foram preenchidos automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar os dados do CEP.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const handleCEPBlur = (cep: string) => {
    if (cep) {
      fetchAddressFromCEP(cep);
    }
  };

  const onSubmit = (data: ClientForm) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? "Visualizar Cliente" : (isEdit ? "Editar Cliente" : "Novo Cliente")}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly 
              ? "Informações do cliente (somente visualização)" 
              : (isEdit ? "Atualize as informações do cliente ou consulte o histórico de eventos" : "Cadastre um novo cliente")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="dados" data-testid="tab-client-dados">
              Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger value="eventos" disabled={!isEdit} data-testid="tab-client-eventos">
              Histórico de Eventos & Financeiro
              {isEdit && clientEvents.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[11px] h-5 px-1.5">
                  {clientEvents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Tipo de Cliente</h3>
                    <FormField
                      control={form.control}
                      name="personType"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex gap-4"
                              data-testid="radio-person-type"
                              disabled={isReadOnly}
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="fisica" id="pessoa-fisica" data-testid="radio-pessoa-fisica" />
                                <Label htmlFor="pessoa-fisica" className="flex items-center gap-2 cursor-pointer">
                                  <User className="h-4 w-4" />
                                  Pessoa Fisica
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="juridica" id="pessoa-juridica" data-testid="radio-pessoa-juridica" />
                                <Label htmlFor="pessoa-juridica" className="flex items-center gap-2 cursor-pointer">
                                  <Building2 className="h-4 w-4" />
                                  Pessoa Juridica
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-4">Dados Basicos</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{personType === "juridica" ? "Nome da Empresa *" : "Nome *"}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={personType === "juridica" ? "Nome da empresa" : "Nome do cliente"} 
                                data-testid="input-client-name"
                                disabled={isReadOnly}
                              />
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
                              <Input 
                                {...field} 
                                placeholder="(00) 00000-0000" 
                                data-testid="input-client-phone" 
                                disabled={isReadOnly}
                                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone 2</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="(00) 00000-0000" 
                                data-testid="input-client-phone2" 
                                disabled={isReadOnly}
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
                              <Input {...field} type="email" placeholder="email@exemplo.com" data-testid="input-client-email" disabled={isReadOnly} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {personType === "fisica" && (
                        <FormField
                          control={form.control}
                          name="profession"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Profissão</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""}
                                  placeholder="Ex: Advogada" 
                                  data-testid="input-client-profession" 
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {personType === "juridica" && (
                        <>
                          <FormField
                            control={form.control}
                            name="responsibleName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do Responsável</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    value={field.value || ""} 
                                    placeholder="Nome do responsável" 
                                    data-testid="input-client-responsible-name"
                                    disabled={isReadOnly}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="cargo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cargo</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    value={field.value || ""} 
                                    placeholder="Cargo do responsável" 
                                    data-testid="input-client-cargo"
                                    disabled={isReadOnly}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-4">Documentos</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {personType === "juridica" && (
                        <FormField
                          key="cnpj-field"
                          control={form.control}
                          name="cnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CNPJ</FormLabel>
                              <FormControl>
                                <Input 
                                  value={field.value || ""} 
                                  placeholder="00.000.000/0000-00" 
                                  data-testid="input-client-cnpj"
                                  disabled={isReadOnly}
                                  onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {personType === "fisica" && (
                        <>
                          <FormField
                            key="cpf-field"
                            control={form.control}
                            name="cpf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={field.value || ""} 
                                    placeholder="000.000.000-00" 
                                    data-testid="input-client-cpf" 
                                    disabled={isReadOnly}
                                    onChange={(e) => field.onChange(maskCPF(e.target.value))}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            key="rg-field"
                            control={form.control}
                            name="rg"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>RG</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={field.value || ""} 
                                    placeholder="00.000.000-0" 
                                    data-testid="input-client-rg" 
                                    disabled={isReadOnly}
                                    onChange={(e) => field.onChange(maskRG(e.target.value))}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço
                    </h3>
                    <div className="grid gap-4">
                      <div className="flex gap-4 flex-wrap">
                        <FormField
                          control={form.control}
                          name="cep"
                          render={({ field }) => (
                            <FormItem className="w-36">
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    placeholder="00000-000" 
                                    data-testid="input-client-cep"
                                    onBlur={(e) => !isReadOnly && handleCEPBlur(e.target.value)}
                                    maxLength={9}
                                    disabled={isReadOnly}
                                    onChange={(e) => field.onChange(maskCEP(e.target.value))}
                                  />
                                  {isLoadingCEP && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
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
                            <FormItem className="w-16">
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="UF" data-testid="input-client-estado" maxLength={2} disabled={isReadOnly} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cidade"
                          render={({ field }) => (
                            <FormItem className="flex-1 min-w-48">
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nome da cidade" data-testid="input-client-cidade" disabled={isReadOnly} />
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
                                <Input {...field} placeholder="Nome do bairro" data-testid="input-client-bairro" disabled={isReadOnly} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="rua"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rua</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nome da rua" data-testid="input-client-rua" disabled={isReadOnly} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-20">
                        <FormField
                          control={form.control}
                          name="numero"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nº" data-testid="input-client-numero" disabled={isReadOnly} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Informações adicionais sobre o cliente" rows={3} data-testid="input-client-notes" disabled={isReadOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                    {isReadOnly ? "Fechar" : "Cancelar"}
                  </Button>
                  {!isReadOnly && (
                    <Button type="submit" disabled={mutation.isPending} data-testid="button-save-client">
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEdit ? "Atualizar" : "Cadastrar"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="eventos" className="space-y-6">
            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumo Financeiro do Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card/50 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Contratado
                    </span>
                    <span className="text-lg font-bold text-foreground mt-1 font-mono">
                      {formatCurrency(financialSummary.totalContracted)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Total Recebido
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                      {formatCurrency(financialSummary.totalReceived)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between ${
                    financialSummary.totalPending > 0
                      ? "bg-red-500/10 border-red-500/30 dark:bg-red-950/20"
                      : "bg-card/50 border-border"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        financialSummary.totalPending > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      }`}>
                        Pendência Financeira
                      </span>
                      {financialSummary.totalPending > 0 ? (
                        <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <span className={`text-lg font-bold mt-1 font-mono ${
                      financialSummary.totalPending > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                    }`}>
                      {formatCurrency(financialSummary.totalPending)}
                    </span>
                    {financialSummary.pendingEventsCount > 0 && (
                      <span className="text-[11px] font-medium text-red-500 mt-0.5">
                        {financialSummary.pendingEventsCount} evento(s) com pendência em aberto
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabela com o Histórico de Eventos e Status Financeiro */}
                {clientEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
                    <Calendar className="h-10 w-10 text-muted-foreground/60 mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum evento registrado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este cliente ainda não possui nenhum evento cadastrado no sistema.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden bg-card shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold text-xs">Data</TableHead>
                          <TableHead className="font-semibold text-xs">Evento</TableHead>
                          <TableHead className="font-semibold text-xs text-right">Valor Contrato</TableHead>
                          <TableHead className="font-semibold text-xs text-right">Total Pago</TableHead>
                          <TableHead className="font-semibold text-xs text-center">Status Evento</TableHead>
                          <TableHead className="font-semibold text-xs text-center">Status Financeiro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientEvents.map((ev: any) => {
                          const contractVal = parseFloat(ev.contractValue || "0");
                          const ticketVal = parseFloat(ev.ticketValue || "0");
                          const installmentsList = ev.eventInstallments || [];
                          const installmentsSum = installmentsList.reduce(
                            (sum: number, inst: any) => sum + parseFloat(inst.amount || "0"),
                            0
                          );
                          const hasMatchingEntry = ticketVal > 0 && installmentsList.some((inst: any) => Math.abs(parseFloat(inst.amount || "0") - ticketVal) < 0.01);
                          const isCoveredByInstallments = contractVal > 0 && installmentsSum >= contractVal - 0.01;
                          const paidVal = (hasMatchingEntry || isCoveredByInstallments) ? installmentsSum : installmentsSum + ticketVal;
                          const pendingVal = Math.max(0, contractVal - paidVal);

                          const statusInfo = eventStatusLabels[ev.status] || {
                            label: ev.status === "paid_full" ? "Total Pago" : ev.status === "paid_entry" ? "Entrada Paga" : (ev.status || "Definido"),
                            color: "bg-gray-100 text-gray-800 border-gray-300",
                          };

                          return (
                            <TableRow key={ev.id} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="font-medium text-xs whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span>
                                    {ev.date
                                      ? format(new Date(ev.date), "dd/MM/yyyy", { locale: ptBR })
                                      : "-"}
                                  </span>
                                </div>
                                {ev.startTime && (
                                  <div className="text-[11px] text-muted-foreground ml-5">
                                    às {ev.startTime}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-sm text-foreground">{ev.title}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {ev.eventType === "service" ? "Serviço (15 Anos / Casamento)" : "Pacote de Personagens"}
                                  {ev.cidade ? ` • ${ev.cidade}` : ""}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-medium">
                                {formatCurrency(contractVal)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(paidVal)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {ev.status === "cancelled" ? (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-[11px]">
                                    Cancelado
                                  </Badge>
                                ) : pendingVal <= 0 ? (
                                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1 mx-auto w-fit">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                    Quitado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-[11px] font-semibold flex items-center justify-center gap-1 mx-auto w-fit">
                                    <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
                                    Pendente: {formatCurrency(pendingVal)}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
