import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, FileText, Receipt, Save, Check, ChevronsUpDown, Copy } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const calculateDuration = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // crosses midnight
  return parseFloat((diff / 60).toFixed(2));
};

export interface QuoteCharacter {
  name: string;
  value: number;
  quantity: number;
}

export interface QuoteSchedule {
  date: string;
  period: string;
  startTime: string;
  endTime: string;
  location: string;
}

export interface QuoteFormValues {
  clientName: string;
  eventType: string;
  daysCount: number;
  schedule: QuoteSchedule[];
  scope: {
    approximateAttendees: string;
    childrenCount: string;
    needsLodging: boolean;
    isPublicEvent: boolean;
    interest: string;
    packageId?: string;
  };
  costs: {
    producers: number;
    producersCount: number;
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
  discountPercentage: number;
}

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: any; // If editing an existing quote
}

function CharacterCombobox({ value, onChange, characters }: { value: string, onChange: (val: string) => void, characters: any[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value || "Selecione um personagem..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ou digitar personagem..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Nenhum encontrado. Digite para usar sem cadastro.</CommandEmpty>
            <CommandGroup>
              {search && !characters.some(c => c.name.toLowerCase() === search.toLowerCase()) && (
                <CommandItem
                  value={search}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === search ? "opacity-100" : "opacity-0")} />
                  Usar "{search}" (Sem cadastro)
                </CommandItem>
              )}
              {characters.map((char) => (
                <CommandItem
                  key={char.id}
                  value={char.name}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === char.name ? "opacity-100" : "opacity-0")} />
                  {char.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function QuoteDialog({ open, onOpenChange, quote }: QuoteDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const { data: clients, isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: inventoryItems } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });
  const inventoryCharacters = inventoryItems?.filter(item => item.type === "character") || [];

  const { data: packages, isLoading: isLoadingPackages } = useQuery<any[]>({
    queryKey: ["/api/settings/packages"],
  });

  const defaultValues: QuoteFormValues = {
    clientName: "",
    eventType: "casamento",
    daysCount: 1,
    schedule: [{ date: "", period: "integral", startTime: "", endTime: "", location: "" }],
    scope: {
      approximateAttendees: "",
      childrenCount: "",
      needsLodging: false,
      isPublicEvent: false,
      interest: "recepcao",
      packageId: "",
    },
    costs: {
      producers: 0,
      producersCount: 1,
      drivers: 0,
      fuel: 0,
      lodging: 0,
      food: 0,
      tolls: 0,
      materials: 0,
      extras: 0,
    },
    characters: [{ name: "", value: 0, quantity: 1 }],
    profitMargin: 40, // 40% default
    discountPercentage: 0,
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
        daysCount: quote.details?.daysCount || 1,
        schedule: quote.details?.schedule?.length > 0 
          ? quote.details.schedule 
          : (quote.details?.eventDates?.length > 0 
            ? quote.details.eventDates.map((d: string) => ({ 
                date: d, 
                period: "integral", 
                startTime: "", 
                endTime: "", 
                location: quote.details?.scope?.location || "" 
              }))
            : [{ 
                date: quote.eventDate ? new Date(quote.eventDate).toISOString().split('T')[0] : "", 
                period: "integral", 
                startTime: "", 
                endTime: "", 
                location: quote.details?.scope?.location || "" 
              }]),
        scope: {
          approximateAttendees: quote.details?.scope?.approximateAttendees || "",
          childrenCount: quote.details?.scope?.childrenCount || "",
          needsLodging: quote.details?.scope?.needsLodging || false,
          isPublicEvent: quote.details?.scope?.isPublicEvent || false,
          interest: quote.details?.scope?.interest || "recepcao",
          packageId: quote.details?.scope?.packageId || "",
        },
        costs: {
          ...defaultValues.costs,
          ...quote.details?.costs
        },
        characters: quote.details?.characters?.length > 0 ? quote.details.characters.map((c: any) => ({
          name: c.name || "",
          value: c.value || 0,
          quantity: c.quantity || 1
        })) : [{ name: "", value: 0, quantity: 1 }],
        profitMargin: parseFloat(quote.profitMargin) || 40,
        discountPercentage: quote.details?.discountPercentage || 0,
      });
    } else {
      reset(defaultValues);
    }
  }, [quote, reset, open]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "characters",
  });

  const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({
    control,
    name: "schedule",
  });

  const watchClientName = watch("clientName");
  const watchEventType = watch("eventType");
  const watchCosts = watch("costs");
  const watchProfitMargin = watch("profitMargin");
  const watchDiscountPercentage = watch("discountPercentage");
  const watchCharacters = watch("characters");
  const watchSchedule = watch("schedule");

  const charactersCost = (watchCharacters || []).reduce((acc, char) => {
    return acc + (Number(char.value) * Number(char.quantity) || 0);
  }, 0);

  const producersCost = (Number(watchCosts?.producers) || 0) * (Number(watchCosts?.producersCount) || 1);

  const dailyOperationalCosts = 
    charactersCost +
    producersCost +
    (Number(watchCosts?.drivers) || 0) +
    (Number(watchCosts?.fuel) || 0) +
    (Number(watchCosts?.lodging) || 0) +
    (Number(watchCosts?.food) || 0) +
    (Number(watchCosts?.tolls) || 0);

  const uniqueDatesCount = new Set((watchSchedule || []).map(s => s.date).filter(Boolean)).size;
  const daysCount = uniqueDatesCount > 0 ? uniqueDatesCount : 1;
  const fixedCosts = (Number(watchCosts?.materials) || 0) + (Number(watchCosts?.extras) || 0);

  const totalCosts = (dailyOperationalCosts * daysCount) + fixedCosts;

  const profitAmount = totalCosts * ((Number(watchProfitMargin) || 0) / 100);
  const totalValueBeforeDiscount = totalCosts + profitAmount;
  const discountAmount = totalValueBeforeDiscount * ((Number(watchDiscountPercentage) || 0) / 100);
  const totalValue = totalValueBeforeDiscount - discountAmount;

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
      daysCount,
      totalValue,
      totalCosts,
    });
  };

  const onSave = (data: QuoteFormValues) => {
    const payload = {
      clientName: data.clientName,
      eventType: data.eventType,
      eventDate: data.schedule?.[0]?.date || null,
      totalCosts: totalCosts.toString(),
      profitMargin: data.profitMargin.toString(),
      totalValue: totalValue.toString(),
      status: quote?.status || "draft",
      details: {
        schedule: data.schedule || [],
        daysCount,
        discountPercentage: Number(data.discountPercentage) || 0,
        scope: data.scope,
        costs: {
          producers: Number(data.costs.producers) || 0,
          producersCount: Number(data.costs.producersCount) || 1,
          drivers: Number(data.costs.drivers) || 0,
          fuel: Number(data.costs.fuel) || 0,
          lodging: Number(data.costs.lodging) || 0,
          food: Number(data.costs.food) || 0,
          tolls: Number(data.costs.tolls) || 0,
          materials: Number(data.costs.materials) || 0,
          extras: Number(data.costs.extras) || 0,
        },
        characters: data.characters
          .filter(c => c.name.trim() !== '')
          .map(c => ({
            name: c.name,
            value: Number(c.value) || 0,
            quantity: Number(c.quantity) || 1
          })),
      }
    };
    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0" onInteractOutside={(e) => e.preventDefault()}>
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
                        <CommandInput 
                          placeholder="Buscar ou digitar cliente..." 
                          value={clientSearch}
                          onValueChange={setClientSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado. Digite para usar nome sem cadastro.</CommandEmpty>
                          <CommandGroup>
                            {clientSearch && !clients?.some(c => c.name.toLowerCase() === clientSearch.toLowerCase()) && (
                              <CommandItem
                                value={clientSearch}
                                onSelect={(currentValue) => {
                                  setValue("clientName", currentValue);
                                  setClientPopoverOpen(false);
                                  setClientSearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchClientName === clientSearch ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Usar "{clientSearch}" (Sem cadastro)
                              </CommandItem>
                            )}
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
                <div className="space-y-2">
                  <Label>Pacote</Label>
                  <Select 
                    value={watch("scope.packageId") || "none"} 
                    onValueChange={(val) => setValue("scope.packageId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum pacote</SelectItem>
                      {watch("scope.packageId") && watch("scope.packageId") !== "none" && !packages?.some(p => p.id === watch("scope.packageId")) && (
                        <SelectItem value={watch("scope.packageId")!}>Pacote Personalizado/Legado</SelectItem>
                      )}
                      {packages?.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="mt-6 border-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base font-semibold">Cronograma do Evento</CardTitle>
                      <p className="text-sm text-muted-foreground">Defina as datas, locais e horários.</p>
                    </div>
                    <Button 
                      type="button" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                      size="sm"
                      onClick={() => appendSchedule({ date: "", period: "integral", startTime: "", endTime: "", location: "" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Período
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scheduleFields.map((field, index) => {
                    const start = watch(`schedule.${index}.startTime`);
                    const end = watch(`schedule.${index}.endTime`);
                    const hours = calculateDuration(start, end);
                    return (
                      <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-accent/30 p-3 rounded-lg">
                        <div className="space-y-2 w-full sm:w-[150px] flex-shrink-0">
                          <Label>Data</Label>
                          <Input type="date" {...register(`schedule.${index}.date`, { required: true })} />
                        </div>
                        <div className="space-y-2 w-full sm:w-[120px] flex-shrink-0">
                          <Label>Período</Label>
                          <Select
                            value={watch(`schedule.${index}.period`) || "integral"}
                            onValueChange={(val) => setValue(`schedule.${index}.period`, val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manha">Manhã</SelectItem>
                              <SelectItem value="tarde">Tarde</SelectItem>
                              <SelectItem value="noite">Noite</SelectItem>
                              <SelectItem value="integral">Integral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 w-full sm:w-auto flex-1 min-w-[150px]">
                          <Label>Local</Label>
                          <Input placeholder="Local do evento" {...register(`schedule.${index}.location`)} />
                        </div>
                        <div className="space-y-2 w-full sm:w-[100px] flex-shrink-0">
                          <Label>Início</Label>
                          <Input type="time" {...register(`schedule.${index}.startTime`, { required: true })} />
                        </div>
                        <div className="space-y-2 w-full sm:w-[100px] flex-shrink-0">
                          <Label>Término</Label>
                          <Input type="time" {...register(`schedule.${index}.endTime`, { required: true })} />
                        </div>
                        
                        <div className="flex flex-col gap-1 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                          <span className="text-[11px] text-muted-foreground text-center font-medium h-4">
                            {hours > 0 ? `${hours}h total` : ""}
                          </span>
                          <div className="flex gap-1 h-10 mt-auto">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Duplicar Dia"
                              onClick={() => {
                                const current = watch(`schedule.${index}`);
                                appendSchedule(current);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Remover"
                              className="text-destructive"
                              onClick={() => removeSchedule(index)}
                              disabled={scheduleFields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="flex gap-6 pt-6">
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

              <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="button" onClick={() => setActiveTab("costs")}>Próximo: Custos</Button>
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
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label>Produtor (Valor Un. R$)</Label>
                        <div className="flex gap-2">
                          <Input type="number" min="0" step="0.01" {...register("costs.producers")} />
                          <Input type="number" min="1" className="w-20" {...register("costs.producersCount")} placeholder="Qtd" />
                        </div>
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

                <Card className="border-border shadow-sm md:col-span-2">
                    <CardHeader className="bg-muted/30 pb-3 py-4 flex flex-row items-center justify-between">
                      <DialogTitle className="text-base text-primary">Personagens</DialogTitle>
                      <Button type="button" onClick={() => append({ name: "", value: 0, quantity: 1 })} variant="ghost" size="sm" className="h-8 gap-1">
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 max-h-[40vh] overflow-y-auto">
                      {fields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhum personagem adicionado.</p>
                      )}
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 border-b sm:border-0 pb-3 sm:pb-0">
                          <div className="w-full sm:flex-1">
                            <Label className="sm:hidden mb-1 block text-xs">Personagem</Label>
                            <CharacterCombobox
                              value={watch(`characters.${index}.name`)}
                              onChange={(val) => setValue(`characters.${index}.name`, val)}
                              characters={inventoryCharacters}
                            />
                          </div>
                          <div className="flex w-full sm:w-auto items-end gap-2">
                            <div className="flex-1 sm:w-28">
                              <Label className="sm:hidden mb-1 block text-xs">Valor (R$)</Label>
                              <Input type="number" min="0" step="0.01" placeholder="Cachê" {...register(`characters.${index}.value`)} />
                            </div>
                            <div className="w-20">
                              <Label className="sm:hidden mb-1 block text-xs">Qtd</Label>
                              <Input type="number" min="1" placeholder="Qtd" {...register(`characters.${index}.quantity`)} />
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              onClick={() => {
                                const current = watchCharacters[index];
                                append({ ...current });
                              }} 
                              className="shrink-0"
                              title="Duplicar personagem"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0" title="Remover">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab("info")}>Voltar</Button>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground block">
                      Custo Total Base
                      {daysCount > 1 ? ` (x${daysCount} dias)` : ""}
                    </span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(totalCosts)}</span>
                  </div>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="button" onClick={() => setActiveTab("summary")}>Próximo: Lucro</Button>
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
                        <span>Custo Total Operacional (x{daysCount} dias)</span>
                        <span>{formatCurrency(totalCosts)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 font-medium">
                        <span>Lucro Projetado (+{watchProfitMargin || 0}%)</span>
                        <span>{formatCurrency(profitAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center items-end border-t border-primary/10 pt-3">
                        <Label className="text-base text-muted-foreground">Desconto Comercial (%)</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            className="w-20 text-right h-8" 
                            {...register("discountPercentage")} 
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      {Number(watchDiscountPercentage) > 0 && (
                        <div className="flex justify-between items-center text-red-500 text-sm">
                          <span>Desconto aplicado</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="pt-4 mt-2 border-t border-primary/20 flex justify-between items-end">
                        <span className="text-base font-bold">Valor Final (Cliente)</span>
                        <span className="text-3xl font-black text-primary">{formatCurrency(totalValue)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab("costs")} className="flex-1">Voltar</Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
                
                <Button 
                  onClick={handleSubmit(handleGeneratePDF, () => {
                    toast({
                      title: "Erro de Validação",
                      description: "Preencha os campos obrigatórios (Data, Início e Término do Cronograma).",
                      variant: "destructive"
                    });
                  })} 
                  variant="secondary"
                  className="flex-1 shadow-sm"
                  disabled={!watchClientName}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Visualizar PDF (Cliente)
                </Button>

                <Button 
                  onClick={handleSubmit(onSave, () => {
                    toast({
                      title: "Erro de Validação",
                      description: "Preencha os campos obrigatórios (Data, Início e Término do Cronograma).",
                      variant: "destructive"
                    });
                  })} 
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
