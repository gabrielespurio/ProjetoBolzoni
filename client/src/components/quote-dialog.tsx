import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, FileText, Receipt, Save, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateQuotePDF } from "@/lib/quoteGenerator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export interface QuoteCharacter {
  name: string;
}

export interface QuoteFormValues {
  clientName: string;
  eventType: string;
  eventDate: string;
  scope: {
    approximateAttendees: string;
    childrenCount: string;
    location: string;
    estimatedDuration: string;
    needsLodging: boolean;
    isPublicEvent: boolean;
    interest: string;
  };
  costs: {
    artists: number;
    producers: number;
    drivers: number;
    fuel: number;
    lodging: number;
    food: number;
    tolls: number;
    materials: number;
    extras: number;
  };
  characters: QuoteCharacter[];
  profitMargin: number;
}

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: any; // If editing an existing quote
}

export function QuoteDialog({ open, onOpenChange, quote }: QuoteDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  const { data: clients, isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const defaultValues: QuoteFormValues = {
    clientName: "",
    eventType: "casamento",
    eventDate: "",
    scope: {
      approximateAttendees: "",
      childrenCount: "",
      location: "",
      estimatedDuration: "",
      needsLodging: false,
      isPublicEvent: false,
      interest: "recepcao",
    },
    costs: {
      artists: 0,
      producers: 0,
      drivers: 0,
      fuel: 0,
      lodging: 0,
      food: 0,
      tolls: 0,
      materials: 0,
      extras: 0,
    },
    characters: [{ name: "" }],
    profitMargin: 40, // 40% default
  };

  const { register, control, watch, setValue, handleSubmit, reset } = useForm<QuoteFormValues>({
    defaultValues,
  });

  // Populate data when editing
  useEffect(() => {
    if (quote) {
      reset({
        clientName: quote.clientName || "",
        eventType: quote.eventType || "casamento",
        eventDate: quote.eventDate ? new Date(quote.eventDate).toISOString().split('T')[0] : "",
        scope: quote.details?.scope || defaultValues.scope,
        costs: quote.details?.costs || defaultValues.costs,
        characters: quote.details?.characters?.length > 0 ? quote.details.characters : [{ name: "" }],
        profitMargin: parseFloat(quote.profitMargin) || 40,
      });
    } else {
      reset(defaultValues);
    }
  }, [quote, reset, open]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "characters",
  });

  const watchClientName = watch("clientName");
  const watchEventType = watch("eventType");
  const watchCosts = watch("costs");
  const watchProfitMargin = watch("profitMargin");
  const watchCharacters = watch("characters");

  const totalCosts = 
    (Number(watchCosts?.artists) || 0) +
    (Number(watchCosts?.producers) || 0) +
    (Number(watchCosts?.drivers) || 0) +
    (Number(watchCosts?.fuel) || 0) +
    (Number(watchCosts?.lodging) || 0) +
    (Number(watchCosts?.food) || 0) +
    (Number(watchCosts?.tolls) || 0) +
    (Number(watchCosts?.materials) || 0) +
    (Number(watchCosts?.extras) || 0);

  const profitAmount = totalCosts * ((Number(watchProfitMargin) || 0) / 100);
  const totalValue = totalCosts + profitAmount;

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (quote?.id) {
        return apiRequest("PATCH", `/api/quotes/${quote.id}`, data);
      } else {
        return apiRequest("POST", "/api/quotes", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: quote ? "Orçamento atualizado" : "Orçamento criado",
        description: "O orçamento foi salvo com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar orçamento.",
        variant: "destructive",
      });
    },
  });

  const handleGeneratePDF = (data: QuoteFormValues) => {
    generateQuotePDF({
      ...data,
      totalValue,
      totalCosts,
    });
  };

  const onSave = (data: QuoteFormValues) => {
    const payload = {
      clientName: data.clientName,
      eventType: data.eventType,
      eventDate: data.eventDate || null,
      totalCosts: totalCosts.toString(),
      profitMargin: data.profitMargin.toString(),
      totalValue: totalValue.toString(),
      status: quote?.status || "draft",
      details: {
        scope: data.scope,
        costs: {
          artists: Number(data.costs.artists) || 0,
          producers: Number(data.costs.producers) || 0,
          drivers: Number(data.costs.drivers) || 0,
          fuel: Number(data.costs.fuel) || 0,
          lodging: Number(data.costs.lodging) || 0,
          food: Number(data.costs.food) || 0,
          tolls: Number(data.costs.tolls) || 0,
          materials: Number(data.costs.materials) || 0,
          extras: Number(data.costs.extras) || 0,
        },
        characters: data.characters.filter(c => c.name.trim() !== ''),
      }
    };
    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="text-xl text-primary flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {quote ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1 bg-muted/50">
              <TabsTrigger value="info" className="py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                1. Informações Básicas
              </TabsTrigger>
              <TabsTrigger value="costs" className="py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                2. Composição de Custos
              </TabsTrigger>
              <TabsTrigger value="summary" className="py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                3. Lucro e Resumo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col">
                  <Label>Nome do Cliente</Label>
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientPopoverOpen}
                        className={cn(
                          "justify-between font-normal",
                          !watchClientName && "text-muted-foreground"
                        )}
                      >
                        {watchClientName
                          ? watchClientName
                          : isLoadingClients
                          ? "Carregando clientes..."
                          : "Selecione um cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clients?.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={(currentValue) => {
                                  setValue("clientName", currentValue);
                                  setClientPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchClientName === client.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select 
                    value={watchEventType} 
                    onValueChange={(val) => setValue("eventType", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aniversario">Aniversário</SelectItem>
                      <SelectItem value="15anos">15 Anos</SelectItem>
                      <SelectItem value="casamento">Casamento</SelectItem>
                      <SelectItem value="inauguracao">Inauguração</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="espetaculo">Espetáculo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data do Evento</Label>
                  <Input type="date" {...register("eventDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input placeholder="Cidade / Espaço" {...register("scope.location")} />
                </div>
                <div className="space-y-2">
                  <Label>Tempo estimado (duração)</Label>
                  <Input placeholder="Ex: 2 horas" {...register("scope.estimatedDuration")} />
                </div>
                <div className="space-y-2">
                  <Label>Pessoas Aproximadas</Label>
                  <Input type="number" placeholder="0" {...register("scope.approximateAttendees")} />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de Crianças</Label>
                  <Input type="number" placeholder="0" {...register("scope.childrenCount")} />
                </div>
                <div className="space-y-2">
                  <Label>Interesse</Label>
                  <Select 
                    value={watch("scope.interest")} 
                    onValueChange={(val) => setValue("scope.interest", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recepcao">Recepção</SelectItem>
                      <SelectItem value="espetaculo">Espetáculo</SelectItem>
                      <SelectItem value="recreacao">Recreação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox 
                    checked={watch("scope.needsLodging")}
                    onCheckedChange={(checked) => setValue("scope.needsLodging", checked as boolean)}
                  />
                  <span className="text-sm font-medium">Hospedagem (Acima de 250km)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox 
                    checked={watch("scope.isPublicEvent")}
                    onCheckedChange={(checked) => setValue("scope.isPublicEvent", checked as boolean)}
                  />
                  <span className="text-sm font-medium">Aberto ao Público</span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setActiveTab("costs")}>Próximo: Custos</Button>
              </div>
            </TabsContent>

            <TabsContent value="costs" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="bg-muted/30 pb-3 py-4">
                    <DialogTitle className="text-base text-primary">Custos Operacionais</DialogTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cachê Artistas (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.artists")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Produtor (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.producers")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Motorista (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.drivers")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Deslocamento (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.fuel")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Pedágio (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.tolls")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Alimentação (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.food")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Hospedagem (R$)</Label>
                        <Input type="number" min="0" step="0.01" {...register("costs.lodging")} disabled={!watch("scope.needsLodging")} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-border shadow-sm">
                    <CardHeader className="bg-muted/30 pb-3 py-4">
                      <DialogTitle className="text-base text-primary">Custos Extras / Materiais</DialogTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Materiais (R$)</Label>
                          <Input type="number" min="0" step="0.01" {...register("costs.materials")} placeholder="Bexigas, Pintura..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Atrações Extras (R$)</Label>
                          <Input type="number" min="0" step="0.01" {...register("costs.extras")} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-sm">
                    <CardHeader className="bg-muted/30 pb-3 py-4 flex flex-row items-center justify-between">
                      <DialogTitle className="text-base text-primary">Personagens</DialogTitle>
                      <Button type="button" onClick={() => append({ name: "" })} variant="ghost" size="sm" className="h-8 gap-1">
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 max-h-[30vh] overflow-y-auto">
                      {fields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhum personagem adicionado.</p>
                      )}
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <Input placeholder={`Nome do personagem ${index + 1}`} {...register(`characters.${index}.name`)} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setActiveTab("info")}>Voltar</Button>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground block">Custo Total Base</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(totalCosts)}</span>
                  </div>
                  <Button onClick={() => setActiveTab("summary")}>Próximo: Lucro</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6 outline-none focus-visible:ring-0 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary/20 shadow-md">
                  <CardHeader className="bg-primary/5 pb-3">
                    <DialogTitle className="text-lg">Aplicação de Margem</DialogTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base">Margem de Lucro Desejada (%)</Label>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number" 
                          min="0" 
                          max="500" 
                          className="text-xl font-bold w-32 h-12 text-center" 
                          {...register("profitMargin")} 
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold text-primary mb-4 border-b border-primary/10 pb-2">Resumo Financeiro</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Custo Total Operacional</span>
                        <span>{formatCurrency(totalCosts)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 font-medium">
                        <span>Lucro Projetado (+{watchProfitMargin || 0}%)</span>
                        <span>{formatCurrency(profitAmount)}</span>
                      </div>
                      <div className="pt-4 mt-2 border-t border-primary/20 flex justify-between items-end">
                        <span className="text-base font-bold">Valor Final (Cliente)</span>
                        <span className="text-3xl font-black text-primary">{formatCurrency(totalValue)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setActiveTab("costs")} className="flex-1">Voltar</Button>
                
                <Button 
                  onClick={handleSubmit(handleGeneratePDF)} 
                  variant="secondary"
                  className="flex-1 shadow-sm"
                  disabled={!watchClientName}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Visualizar PDF (Cliente)
                </Button>

                <Button 
                  onClick={handleSubmit(onSave)} 
                  className="flex-1 shadow-sm"
                  disabled={!watchClientName || saveMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Orçamento"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
