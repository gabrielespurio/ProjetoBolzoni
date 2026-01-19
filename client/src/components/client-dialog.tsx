import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Loader2, MapPin, User, Building2 } from "lucide-react";
import { maskCNPJ, maskCPF, maskRG, maskCEP, maskPhone } from "@/lib/masks";

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
  
  // Determine if user can edit based on role
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isReadOnly = readOnly || (userRole !== "admin" && isEdit);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? "Visualizar Cliente" : (isEdit ? "Editar Cliente" : "Novo Cliente")}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly 
              ? "Informações do cliente (somente visualização)" 
              : (isEdit ? "Atualize as informações do cliente" : "Cadastre um novo cliente")}
          </DialogDescription>
        </DialogHeader>
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

            <div className="flex justify-end gap-4">
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
      </DialogContent>
    </Dialog>
  );
}
