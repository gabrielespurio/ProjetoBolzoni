import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Settings as SettingsIcon, RefreshCw, ExternalLink } from "lucide-react";
import type { EventCategory, EmployeeRole, Package, Skill } from "@shared/schema";
import { insertSkillSchema } from "@shared/schema";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

const roleSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  profileType: z.enum(["employee", "secretary", "admin"]).default("employee"),
});

const packageSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

const skillFormSchema = insertSkillSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
});

type CategoryForm = z.infer<typeof categorySchema>;
type RoleForm = z.infer<typeof roleSchema>;
type PackageForm = z.infer<typeof packageSchema>;
type SkillForm = z.infer<typeof skillFormSchema>;

// Tipos para Taxas e Juros
interface SumupFeeData {
  lastUpdated: string;
  pix: { fee: string; description: string };
  tiers: Array<{
    name: string;
    range: string;
    debit: { visa_master: string; others: string };
    credit_cash: { d1: string; instant: string; description: string };
    credit_installments: { d30: string; instant: string; description: string };
  }>;
  promotional?: { description: string; credit_cash: string };
  notes?: string[];
}

interface SumupResponse {
  success: boolean;
  source: string;
  url?: string;
  message?: string;
  data: SumupFeeData;
}

interface CustomFeesData {
  debit: string;
  creditCash: string;
  creditInstallments: string;
}

// Componente para Taxas e Juros
function FeesSettings() {
  const { toast } = useToast();
  const [feeType, setFeeType] = useState<"sumup" | "custom">("sumup");
  const [customFees, setCustomFees] = useState({
    debit: "",
    creditCash: "",
    creditInstallments: "",
  });
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<string>("");

  // Buscar tipo de taxa atual
  const { data: feeTypeData, isLoading: loadingFeeType } = useQuery<{ type: string }>({
    queryKey: ["/api/settings/fees/type"],
  });

  // Buscar taxas da Sumup
  const { data: sumupData, isLoading: loadingSumup, refetch: refetchSumup } = useQuery<SumupResponse>({
    queryKey: ["/api/settings/fees/sumup"],
    enabled: feeType === "sumup",
  });

  // Buscar taxas personalizadas
  const { data: customData, isLoading: loadingCustom } = useQuery<CustomFeesData | null>({
    queryKey: ["/api/settings/fees/custom"],
    enabled: feeType === "custom",
  });

  // Buscar taxa de juros mensal
  const { data: interestData } = useQuery<{ monthlyInterestRate: string }>({
    queryKey: ["/api/settings/fees/monthly-interest"],
  });

  // Atualizar tipo de taxa quando os dados chegam
  useEffect(() => {
    if (feeTypeData?.type && (feeTypeData.type === "sumup" || feeTypeData.type === "custom")) {
      setFeeType(feeTypeData.type as "sumup" | "custom");
    }
  }, [feeTypeData]);

  // Atualizar taxas personalizadas quando os dados chegam
  useEffect(() => {
    if (customData) {
      setCustomFees({
        debit: customData.debit || "",
        creditCash: customData.creditCash || "",
        creditInstallments: customData.creditInstallments || "",
      });
    }
  }, [customData]);

  // Atualizar taxa de juros quando os dados chegam
  useEffect(() => {
    if (interestData?.monthlyInterestRate) {
      setMonthlyInterestRate(interestData.monthlyInterestRate);
    }
  }, [interestData]);

  // Mutation para salvar tipo de taxa
  const saveFeeTypeMutation = useMutation({
    mutationFn: async (type: "sumup" | "custom") => {
      return apiRequest("POST", "/api/settings/fees/type", { type });
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/fees/type"] });
      setFeeType(type);
      toast({
        title: "Tipo de taxa atualizado",
        description: `Usando taxas ${type === "sumup" ? "da Sumup" : "personalizadas"}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar tipo de taxa",
        variant: "destructive",
      });
    },
  });

  // Mutation para salvar taxa de juros mensal
  const saveInterestRateMutation = useMutation({
    mutationFn: async (rate: string) => {
      // Normalizar: substituir vírgula por ponto e validar
      const normalizedRate = rate.replace(',', '.');
      const numericRate = parseFloat(normalizedRate);
      
      if (isNaN(numericRate) || !isFinite(numericRate) || numericRate < 0) {
        throw new Error("Taxa de juros inválida. Use apenas números positivos (ex: 2.5 ou 2,5)");
      }
      
      return apiRequest("POST", "/api/settings/fees/monthly-interest", { monthlyInterestRate: String(numericRate) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/fees/monthly-interest"] });
      toast({
        title: "Taxa de juros atualizada",
        description: "A taxa de juros mensal foi atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar taxa de juros",
        variant: "destructive",
      });
    },
  });

  // Mutation para salvar taxas personalizadas
  const saveCustomFeesMutation = useMutation({
    mutationFn: async (fees: typeof customFees) => {
      return apiRequest("POST", "/api/settings/fees/custom", { fees });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/fees/custom"] });
      toast({
        title: "Taxas personalizadas salvas",
        description: "As taxas foram atualizadas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar taxas personalizadas",
        variant: "destructive",
      });
    },
  });

  const handleSaveCustomFees = () => {
    if (!customFees.debit || !customFees.creditCash || !customFees.creditInstallments) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todas as taxas antes de salvar",
        variant: "destructive",
      });
      return;
    }
    saveCustomFeesMutation.mutate(customFees);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxas e Juros</CardTitle>
        <CardDescription>
          Configure as taxas de processamento de pagamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de tipo */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Tipo de Taxas</label>
          <Select 
            value={feeType} 
            onValueChange={(value) => saveFeeTypeMutation.mutate(value as "sumup" | "custom")}
            disabled={loadingFeeType || saveFeeTypeMutation.isPending}
          >
            <SelectTrigger data-testid="select-fee-type">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sumup">Sumup (Web Scraping)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Escolha entre usar as taxas oficiais da Sumup ou definir taxas personalizadas
          </p>
        </div>

        {/* Taxa de Juros Mensal para Parcelamento */}
        <div className="space-y-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="monthly-interest" className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Taxa de Juros Mensal (%)
              </label>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Juros compostos aplicados em parcelamentos de cartão de crédito (Tabela Price)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="monthly-interest"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={monthlyInterestRate}
                onChange={(e) => setMonthlyInterestRate(e.target.value)}
                placeholder="Ex: 2.5"
                className="pr-8"
                data-testid="input-monthly-interest"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">% a.m.</span>
            </div>
            <Button 
              onClick={() => saveInterestRateMutation.mutate(monthlyInterestRate)}
              disabled={saveInterestRateMutation.isPending || !monthlyInterestRate}
              data-testid="button-save-monthly-interest"
            >
              {saveInterestRateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            <strong>Como funciona:</strong> Primeiro aplica-se a taxa da operadora (ex: 5,49% da SumUp), 
            depois os juros mensais sobre o valor restante usando a fórmula da Tabela Price.
          </p>
        </div>

        {/* Exibir taxas da Sumup */}
        {feeType === "sumup" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Taxas da Sumup</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchSumup()}
                  disabled={loadingSumup}
                  data-testid="button-refresh-sumup"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingSumup ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open("https://www.sumup.com/pt-br/maquininhas/taxas/", "_blank")}
                  data-testid="button-view-sumup"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no Site
                </Button>
              </div>
            </div>

            {loadingSumup ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sumupData?.data ? (
              <div className="space-y-4">
                {/* PIX */}
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">PIX</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">{sumupData.data.pix.description}</p>
                    </div>
                    <Badge className="bg-green-600 text-white">{sumupData.data.pix.fee}</Badge>
                  </div>
                </div>

                {/* Faixas de faturamento */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Faixas de Faturamento</h4>
                  {sumupData.data.tiers.map((tier: any, index: number) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-3">
                        <CardTitle className="text-base">{tier.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Débito</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">Visa/Master:</span>
                              <span className="ml-2 font-medium">{tier.debit.visa_master}</span>
                            </div>
                            <div className="bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">Outros:</span>
                              <span className="ml-2 font-medium">{tier.debit.others}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">{tier.credit_cash.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">D+1:</span>
                              <span className="ml-2 font-medium">{tier.credit_cash.d1}</span>
                            </div>
                            <div className="bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">Na hora:</span>
                              <span className="ml-2 font-medium">{tier.credit_cash.instant}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">{tier.credit_installments.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">D+30:</span>
                              <span className="ml-2 font-medium">{tier.credit_installments.d30}</span>
                            </div>
                            <div className="bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">Na hora:</span>
                              <span className="ml-2 font-medium">{tier.credit_installments.instant}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Observações */}
                {sumupData.data.notes && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">Observações</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {sumupData.data.notes.map((note: string, i: number) => (
                        <li key={i}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fonte */}
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Fonte: {sumupData.source === "sumup_official" ? "Site oficial da Sumup" : "Dados baseados em informações oficiais"} • 
                  Última atualização: {new Date(sumupData.data.lastUpdated).toLocaleDateString("pt-BR")}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Não foi possível carregar as taxas da Sumup
              </p>
            )}
          </div>
        )}

        {/* Formulário de taxas personalizadas */}
        {feeType === "custom" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Taxas Personalizadas</h3>
            
            {loadingCustom ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="custom-debit" className="text-sm font-medium">
                    Taxa de Débito (%)
                  </label>
                  <div className="relative">
                    <Input
                      id="custom-debit"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={customFees.debit}
                      onChange={(e) => setCustomFees(prev => ({ ...prev, debit: e.target.value }))}
                      placeholder="Ex: 1.99"
                      className="pr-8"
                      data-testid="input-custom-debit"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="custom-credit-cash" className="text-sm font-medium">
                    Taxa de Crédito à Vista (%)
                  </label>
                  <div className="relative">
                    <Input
                      id="custom-credit-cash"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={customFees.creditCash}
                      onChange={(e) => setCustomFees(prev => ({ ...prev, creditCash: e.target.value }))}
                      placeholder="Ex: 3.99"
                      className="pr-8"
                      data-testid="input-custom-credit-cash"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="custom-credit-installments" className="text-sm font-medium">
                    Taxa de Crédito Parcelado (%)
                  </label>
                  <div className="relative">
                    <Input
                      id="custom-credit-installments"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={customFees.creditInstallments}
                      onChange={(e) => setCustomFees(prev => ({ ...prev, creditInstallments: e.target.value }))}
                      placeholder="Ex: 4.99"
                      className="pr-8"
                      data-testid="input-custom-credit-installments"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveCustomFees}
                  disabled={saveCustomFeesMutation.isPending}
                  className="w-full"
                  data-testid="button-save-custom-fees"
                >
                  {saveCustomFeesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Taxas Personalizadas
                </Button>

                <p className="text-xs text-muted-foreground">
                  Estas taxas serão usadas para calcular os custos de processamento de pagamentos nos eventos
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [editingRole, setEditingRole] = useState<EmployeeRole | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [kmValue, setKmValue] = useState<string>("");

  // Event Categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery<EventCategory[]>({
    queryKey: ["/api/settings/event-categories"],
  });

  // Employee Roles
  const { data: roles = [], isLoading: loadingRoles } = useQuery<EmployeeRole[]>({
    queryKey: ["/api/settings/employee-roles"],
  });

  // Packages
  const { data: packages = [], isLoading: loadingPackages } = useQuery<Package[]>({
    queryKey: ["/api/settings/packages"],
  });

  // Skills
  const { data: skills = [], isLoading: loadingSkills } = useQuery<Skill[]>({
    queryKey: ["/api/settings/skills"],
  });

  // System Settings - Kilometragem
  const { data: kmSetting } = useQuery({
    queryKey: ["/api/settings/system", "km_value"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/system/km_value", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
        });
        if (response.status === 404) {
          return null;
        }
        return response.json();
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (kmSetting?.value) {
      setKmValue(kmSetting.value);
    }
  }, [kmSetting]);

  const saveKmMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest("POST", "/api/settings/system", { key: "km_value", value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/system", "km_value"] });
      toast({
        title: "Configuração salva",
        description: "Valor de quilometragem atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração.",
        variant: "destructive",
      });
    },
  });

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  const roleForm = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "", profileType: "employee" },
  });

  const packageForm = useForm<PackageForm>({
    resolver: zodResolver(packageSchema),
    defaultValues: { name: "", description: "" },
  });

  const skillForm = useForm<SkillForm>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: { name: "", description: "" },
  });

  // Category mutations
  const categoryMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      if (editingCategory) {
        return apiRequest("PATCH", `/api/settings/event-categories/${editingCategory.id}`, data);
      }
      return apiRequest("POST", "/api/settings/event-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/event-categories"] });
      toast({
        title: editingCategory ? "Categoria atualizada" : "Categoria criada",
        description: "Operação realizada com sucesso.",
      });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a categoria.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/event-categories/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/event-categories"] });
      toast({
        title: "Categoria deletada",
        description: "Categoria deletada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar categoria.",
        variant: "destructive",
      });
    },
  });

  // Role mutations
  const roleMutation = useMutation({
    mutationFn: async (data: RoleForm) => {
      if (editingRole) {
        return apiRequest("PATCH", `/api/settings/employee-roles/${editingRole.id}`, data);
      }
      return apiRequest("POST", "/api/settings/employee-roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/employee-roles"] });
      toast({
        title: editingRole ? "Função atualizada" : "Função criada",
        description: "Operação realizada com sucesso.",
      });
      setRoleDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a função.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/employee-roles/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/employee-roles"] });
      toast({
        title: "Função deletada",
        description: "Função deletada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar função.",
        variant: "destructive",
      });
    },
  });

  // Package mutations
  const packageMutation = useMutation({
    mutationFn: async (data: PackageForm) => {
      if (editingPackage) {
        return apiRequest("PATCH", `/api/settings/packages/${editingPackage.id}`, data);
      }
      return apiRequest("POST", "/api/settings/packages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/packages"] });
      toast({
        title: editingPackage ? "Pacote atualizado" : "Pacote criado",
        description: "Operação realizada com sucesso.",
      });
      setPackageDialogOpen(false);
      setEditingPackage(null);
      packageForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o pacote.",
        variant: "destructive",
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/packages/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/packages"] });
      toast({
        title: "Pacote deletado",
        description: "Pacote deletado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar pacote.",
        variant: "destructive",
      });
    },
  });

  // Skill mutations
  const skillMutation = useMutation({
    mutationFn: async (data: SkillForm) => {
      if (editingSkill) {
        return apiRequest("PATCH", `/api/settings/skills/${editingSkill.id}`, data);
      }
      return apiRequest("POST", "/api/settings/skills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/skills"] });
      toast({
        title: editingSkill ? "Habilidade atualizada" : "Habilidade criada",
        description: "Operação realizada com sucesso.",
      });
      setSkillDialogOpen(false);
      setEditingSkill(null);
      skillForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a habilidade.",
        variant: "destructive",
      });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/skills/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/skills"] });
      toast({
        title: "Habilidade deletada",
        description: "Habilidade deletada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar habilidade.",
        variant: "destructive",
      });
    },
  });

  const handleEditCategory = (category: EventCategory) => {
    setEditingCategory(category);
    categoryForm.setValue("name", category.name);
    categoryForm.setValue("description", category.description || "");
    setCategoryDialogOpen(true);
  };

  const handleEditRole = (role: EmployeeRole) => {
    setEditingRole(role);
    roleForm.setValue("name", role.name);
    roleForm.setValue("description", role.description || "");
    roleForm.setValue("profileType", (role.profileType as "employee" | "secretary" | "admin") || "employee");
    setRoleDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    categoryForm.reset();
  };

  const handleCloseRoleDialog = () => {
    setRoleDialogOpen(false);
    setEditingRole(null);
    roleForm.reset();
  };

  const handleEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    packageForm.setValue("name", pkg.name);
    packageForm.setValue("description", pkg.description || "");
    setPackageDialogOpen(true);
  };

  const handleClosePackageDialog = () => {
    setPackageDialogOpen(false);
    setEditingPackage(null);
    packageForm.reset();
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    skillForm.setValue("name", skill.name);
    skillForm.setValue("description", skill.description || "");
    setSkillDialogOpen(true);
  };

  const handleCloseSkillDialog = () => {
    setSkillDialogOpen(false);
    setEditingSkill(null);
    skillForm.reset();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie categorias e funções do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="flex w-full h-auto flex-wrap md:grid md:grid-cols-6 gap-1">
            <TabsTrigger value="categories" className="flex-1 min-w-[100px] text-xs md:text-sm" data-testid="tab-categories">Categorias</TabsTrigger>
            <TabsTrigger value="roles" className="flex-1 min-w-[100px] text-xs md:text-sm" data-testid="tab-roles">Funções</TabsTrigger>
            <TabsTrigger value="packages" className="flex-1 min-w-[100px] text-xs md:text-sm" data-testid="tab-packages">Pacotes</TabsTrigger>
            <TabsTrigger value="skills" className="flex-1 min-w-[100px] text-xs md:text-sm" data-testid="tab-skills">Habilidades</TabsTrigger>
            <TabsTrigger value="km-value" className="flex-1 min-w-[100px] text-xs md:text-sm" data-testid="tab-km-value">Valor/km</TabsTrigger>
            <TabsTrigger value="fees" className="flex-1 min-w-[100px] text-xs md:text-sm" data-testid="tab-fees">Taxas</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Categorias de Eventos</CardTitle>
                    <CardDescription>Gerencie as categorias disponíveis para classificar eventos</CardDescription>
                  </div>
                  <Button onClick={() => setCategoryDialogOpen(true)} className="w-full sm:w-auto" data-testid="button-new-category">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Categoria
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCategory(category)}
                                data-testid={`button-edit-category-${category.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCategoryMutation.mutate(category.id)}
                                data-testid={`button-delete-category-${category.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Funções de Funcionários</CardTitle>
                    <CardDescription>Gerencie as funções disponíveis para funcionários</CardDescription>
                  </div>
                  <Button onClick={() => setRoleDialogOpen(true)} className="w-full sm:w-auto" data-testid="button-new-role">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Função
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRoles ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : roles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma função cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="text-muted-foreground">{role.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditRole(role)}
                                data-testid={`button-edit-role-${role.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteRoleMutation.mutate(role.id)}
                                data-testid={`button-delete-role-${role.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Pacotes</CardTitle>
                    <CardDescription>Gerencie os pacotes disponíveis da empresa</CardDescription>
                  </div>
                  <Button onClick={() => setPackageDialogOpen(true)} className="w-full sm:w-auto" data-testid="button-new-package">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Pacote
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPackages ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : packages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum pacote cadastrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">{pkg.name}</TableCell>
                          <TableCell className="text-muted-foreground">{pkg.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPackage(pkg)}
                                data-testid={`button-edit-package-${pkg.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePackageMutation.mutate(pkg.id)}
                                data-testid={`button-delete-package-${pkg.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Habilidades</CardTitle>
                    <CardDescription>Gerencie as habilidades disponíveis para funcionários</CardDescription>
                  </div>
                  <Button onClick={() => setSkillDialogOpen(true)} className="w-full sm:w-auto" data-testid="button-new-skill">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Habilidade
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSkills ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : skills.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma habilidade cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skills.map((skill) => (
                        <TableRow key={skill.id}>
                          <TableCell className="font-medium">{skill.name}</TableCell>
                          <TableCell className="text-muted-foreground">{skill.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSkill(skill)}
                                data-testid={`button-edit-skill-${skill.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSkillMutation.mutate(skill.id)}
                                data-testid={`button-delete-skill-${skill.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="km-value" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Valor por Quilômetro</CardTitle>
                <CardDescription>
                  Configure o valor cobrado por quilômetro para eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label htmlFor="km-value" className="text-sm font-medium">
                      Valor por km (R$)
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="km-value"
                          type="number"
                          step="0.01"
                          min="0"
                          value={kmValue}
                          onChange={(e) => setKmValue(e.target.value)}
                          placeholder="0.00"
                          className="pl-10"
                          data-testid="input-km-value"
                        />
                      </div>
                      <Button
                        onClick={() => saveKmMutation.mutate(kmValue)}
                        disabled={saveKmMutation.isPending || !kmValue}
                        data-testid="button-save-km-value"
                      >
                        {saveKmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este valor será usado para calcular o custo de deslocamento nos eventos
                    </p>
                  </div>

                  {kmSetting?.value && (
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <p className="text-sm font-medium mb-1">Valor atual configurado</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {parseFloat(kmSetting.value).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/ km</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            <FeesSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={handleCloseCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Atualize as informações da categoria" : "Cadastre uma nova categoria de evento"}
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit((data) => categoryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Aniversário" data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descrição da categoria" rows={3} data-testid="input-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleCloseCategoryDialog} data-testid="button-cancel-category">
                  Cancelar
                </Button>
                <Button type="submit" disabled={categoryMutation.isPending} data-testid="button-save-category">
                  {categoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={handleCloseRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Editar Função" : "Nova Função"}</DialogTitle>
            <DialogDescription>
              {editingRole ? "Atualize as informações da função" : "Cadastre uma nova função de funcionário"}
            </DialogDescription>
          </DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit((data) => roleMutation.mutate(data))} className="space-y-4">
              <FormField
                control={roleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Garçom" data-testid="input-role-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descrição da função" rows={3} data-testid="input-role-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="profileType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil de Acesso *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role-profile">
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee" data-testid="profile-option-employee">Perfil Funcionário</SelectItem>
                        <SelectItem value="secretary" data-testid="profile-option-secretary">Perfil Secretária</SelectItem>
                        <SelectItem value="admin" data-testid="profile-option-admin">Perfil Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleCloseRoleDialog} data-testid="button-cancel-role">
                  Cancelar
                </Button>
                <Button type="submit" disabled={roleMutation.isPending} data-testid="button-save-role">
                  {roleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRole ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={packageDialogOpen} onOpenChange={handleClosePackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
            <DialogDescription>
              {editingPackage ? "Atualize as informações do pacote" : "Cadastre um novo pacote da empresa"}
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit((data) => packageMutation.mutate(data))} className="space-y-4">
              <FormField
                control={packageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Pacote Básico" data-testid="input-package-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descrição do pacote" rows={3} data-testid="input-package-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleClosePackageDialog} data-testid="button-cancel-package">
                  Cancelar
                </Button>
                <Button type="submit" disabled={packageMutation.isPending} data-testid="button-save-package">
                  {packageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPackage ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Skill Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={handleCloseSkillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Editar Habilidade" : "Nova Habilidade"}</DialogTitle>
            <DialogDescription>
              {editingSkill ? "Atualize as informações da habilidade" : "Cadastre uma nova habilidade para funcionários"}
            </DialogDescription>
          </DialogHeader>
          <Form {...skillForm}>
            <form onSubmit={skillForm.handleSubmit((data) => skillMutation.mutate(data))} className="space-y-4">
              <FormField
                control={skillForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Animação" data-testid="input-skill-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={skillForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Descrição da habilidade" rows={3} data-testid="input-skill-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleCloseSkillDialog} data-testid="button-cancel-skill">
                  Cancelar
                </Button>
                <Button type="submit" disabled={skillMutation.isPending} data-testid="button-save-skill">
                  {skillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSkill ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
