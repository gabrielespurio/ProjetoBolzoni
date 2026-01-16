import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEventSchema, type Event, type Client, type Employee, type InventoryItem, type EventCategory, type Package } from "@shared/schema";
import { z } from "zod";
import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Search, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const eventFormSchema = insertEventSchema.extend({
  notes: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória").refine((dateStr) => {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) return false;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return eventDate >= oneYearAgo;
  }, "A data do evento não pode ser anterior a 1 ano da data atual"),
  partyStartTime: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  cep: z.string().optional(),
  estado: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  rua: z.string().optional(),
  venueName: z.string().optional(),
  venueNumber: z.string().optional(),
  kmDistance: z.string().optional(),
  ticketValue: z.string().optional(),
  paymentMethod: z.string().optional(),
  cardType: z.string().optional(),
  paymentDate: z.string().optional(),
  packageId: z.string().optional(),
  packageNotes: z.string().optional(),
  characterIds: z.array(z.string()).optional(),
  expenses: z.array(z.object({
    title: z.string(),
    amount: z.string(),
    description: z.string().optional(),
  })).optional(),
});

type EventForm = z.infer<typeof eventFormSchema>;

type EventExpense = {
  title: string;
  amount: string;
  description?: string;
};

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  event?: Event | null;
}

export function EventDialog({ open, onClose, event }: EventDialogProps) {
  const { toast } = useToast();
  const isEdit = !!event;
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [newExpense, setNewExpense] = useState<EventExpense>({ title: "", amount: "", description: "" });
  const [loadingCep, setLoadingCep] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [kmDistance, setKmDistance] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Array<{ employeeId: string; characterId: string; cacheValue: string }>>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState<{ employeeId: string; characterId: string; cacheValue: string }>({ employeeId: "", characterId: "", cacheValue: "" });
  const [feePercentage, setFeePercentage] = useState<number>(0);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(0);
  const [hasInstallmentInterest, setHasInstallmentInterest] = useState(false);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || 'employee';
  const isAdmin = userRole === 'admin';
  const isEmployee = userRole === 'employee';
  const canViewFinancials = isAdmin;
  const canEdit = isAdmin;
  const isReadOnly = !canEdit;

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

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
    enabled: open,
  });

  const { data: categories } = useQuery<EventCategory[]>({
    queryKey: ["/api/settings/event-categories"],
    enabled: open,
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    enabled: open,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: open,
  });

  const { data: packages } = useQuery<Package[]>({
    queryKey: ["/api/settings/packages"],
    enabled: open,
  });

  const characters = useMemo(() => 
    inventoryItems?.filter(item => item.type === "character") || [],
    [inventoryItems]
  );
  
  const filteredCharacters = useMemo(() =>
    characters.filter(character =>
      character.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [characters, searchTerm]
  );

  const form = useForm<EventForm>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      clientId: "",
      categoryId: undefined,
      date: "",
      cep: "",
      estado: "",
      cidade: "",
      bairro: "",
      rua: "",
      venueName: "",
      venueNumber: "",
      kmDistance: "",
      contractValue: "0",
      ticketValue: "",
      paymentMethod: "",
      cardType: "",
      paymentDate: "",
      packageId: "",
      packageNotes: "",
      status: "scheduled",
      notes: "",
      characterIds: [],
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const cardType = form.watch("cardType");
  const installments = form.watch("installments");

  // Calcular taxa automaticamente
  useEffect(() => {
    const calculateFee = async () => {
      if (!paymentMethod || (paymentMethod !== "cartao_credito" && paymentMethod !== "cartao_debito")) {
        setFeePercentage(0);
        setMonthlyInterestRate(0);
        setHasInstallmentInterest(false);
        return;
      }

      setCalculatingFee(true);
      try {
        // Garantir que installments seja sempre um número válido (default 1)
        const numericInstallments = installments ? parseInt(String(installments)) : 1;
        const validInstallments = isNaN(numericInstallments) || numericInstallments < 1 ? 1 : numericInstallments;
        
        const response = await fetch("/api/settings/fees/calculate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            paymentMethod,
            cardType,
            installments: validInstallments,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setFeePercentage(data.feePercentage || 0);
          setMonthlyInterestRate(data.monthlyInterestRate || 0);
          setHasInstallmentInterest(data.hasInstallmentInterest || false);
        } else {
          setFeePercentage(0);
          setMonthlyInterestRate(0);
          setHasInstallmentInterest(false);
        }
      } catch (error) {
        console.error("Erro ao calcular taxa:", error);
        setFeePercentage(0);
        setMonthlyInterestRate(0);
        setHasInstallmentInterest(false);
      } finally {
        setCalculatingFee(false);
      }
    };

    calculateFee();
  }, [paymentMethod, cardType, installments]);

  useEffect(() => {
    if (open && event) {
      form.reset({
        title: event.title || "",
        clientId: event.clientId || "",
        categoryId: event.categoryId || undefined,
        date: event.date ? (() => {
          const d = new Date(event.date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : "",
        partyStartTime: (event as any).partyStartTime || "",
        startTime: (event as any).startTime || (event.date ? (() => {
          const d = new Date(event.date);
          if (d.getHours() === 0 && d.getMinutes() === 0) return "";
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })() : ""),
        endTime: (event as any).endTime || (event.date ? (() => {
          const d = new Date(event.date);
          // Only use date time if it's NOT midnight (00:00), which usually means date only
          if (d.getHours() === 0 && d.getMinutes() === 0) return "";
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })() : ""),
        cep: (event as any).cep || "",
        estado: (event as any).estado || "",
        cidade: (event as any).cidade || "",
        bairro: (event as any).bairro || "",
        rua: (event as any).rua || "",
        venueName: (event as any).venueName || "",
        venueNumber: (event as any).venueNumber || "",
        kmDistance: (event as any).kmDistance || "",
        contractValue: event.contractValue || "0",
        ticketValue: (event as any).ticketValue || "",
        paymentMethod: (event as any).paymentMethod || "",
        cardType: (event as any).cardType || "",
        installments: (event as any).installments || 1,
        paymentDate: (event as any).paymentDate ? new Date((event as any).paymentDate).toISOString().slice(0, 10) : "",
        packageId: (event as any).packageId || "",
        packageNotes: (event as any).packageNotes || "",
        status: event.status || "scheduled",
        notes: event.notes || "",
        characterIds: [],
      });
      setSelectedCharacters((event as any).characterIds || []);
      // Garantir que as despesas sejam carregadas corretamente
      const loadedExpenses = (event as any).expenses || [];
      console.log("Despesas brutas do evento:", (event as any).expenses);
      setExpenses(loadedExpenses.map((exp: any) => ({
        title: exp.title || "",
        amount: exp.amount?.toString() || "0",
        description: exp.description || ""
      })));
      setKmDistance((event as any).kmDistance || "");
      setSelectedEmployees((event as any).eventEmployees?.map((ee: any) => ({
        employeeId: ee.employeeId,
        characterId: ee.characterId || "",
        cacheValue: ee.cacheValue || "0"
      })) || []);
    } else if (open && !event) {
      form.reset({
        title: "",
        clientId: "",
        categoryId: undefined,
        date: "",
        startTime: "",
        endTime: "",
        cep: "",
        estado: "",
        cidade: "",
        bairro: "",
        rua: "",
        venueName: "",
        venueNumber: "",
        kmDistance: "",
        contractValue: "0",
        ticketValue: "",
        paymentMethod: "",
        cardType: "",
        installments: 1,
        paymentDate: "",
        packageId: "",
        packageNotes: "",
        partyStartTime: "",
        status: "scheduled",
        notes: "",
        characterIds: [],
      });
      setSelectedCharacters([]);
      setExpenses([]);
      setKmDistance("");
      setSelectedEmployees([]);
    }
  }, [open, event]);

  const charactersTotal = useMemo(() => {
    return selectedCharacters.reduce((sum, characterId) => {
      const character = characters.find(c => c.id === characterId);
      const price = character?.salePrice ? parseFloat(character.salePrice) : 0;
      return sum + price;
    }, 0);
  }, [selectedCharacters, characters]);
  
  const expensesTotal = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const amount = expense.amount ? parseFloat(expense.amount) : 0;
      return sum + amount;
    }, 0);
  }, [expenses]);

  const kmTotal = useMemo(() => {
    const km = kmDistance ? parseFloat(kmDistance) : 0;
    const kmValue = kmSetting?.value ? parseFloat(kmSetting.value) : 0;
    return km * kmValue;
  }, [kmDistance, kmSetting]);

  const employeeCacheTotal = useMemo(() => {
    return selectedEmployees.reduce((sum, emp) => {
      const cacheValue = emp.cacheValue ? parseFloat(emp.cacheValue) : 0;
      return sum + cacheValue;
    }, 0);
  }, [selectedEmployees]);

  useEffect(() => {
    const total = charactersTotal + expensesTotal + kmTotal;
    form.setValue("contractValue", total.toFixed(2), { shouldValidate: false, shouldDirty: false });
  }, [charactersTotal, expensesTotal, kmTotal, form]);

  const mutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const payload = {
        ...data,
        characterIds: selectedCharacters,
        expenses: expenses,
        eventEmployees: selectedEmployees.map(emp => ({
          employeeId: emp.employeeId,
          characterId: emp.characterId || null,
          cacheValue: emp.cacheValue,
        })),
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/events/${event.id}`, payload);
      } else {
        return apiRequest("POST", "/api/events", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: isEdit ? "Evento atualizado" : "Evento criado",
        description: isEdit ? "Evento atualizado com sucesso." : "Novo evento cadastrado com sucesso.",
      });
      setSelectedCharacters([]);
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o evento.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventForm) => {
    // Combine date and time correctly for the 'date' field
    const [year, month, day] = data.date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);

    if (data.startTime) {
      const [hours, minutes] = data.startTime.split(":").map(Number);
      dateObj.setHours(hours, minutes, 0, 0);
    } else {
      dateObj.setHours(0, 0, 0, 0);
    }

    const eventData = {
      ...data,
      date: dateObj,
      partyStartTime: data.partyStartTime || null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      categoryId: data.categoryId || undefined,
      kmDistance: data.kmDistance && data.kmDistance !== "" ? data.kmDistance : null,
      ticketValue: data.ticketValue && data.ticketValue !== "" ? data.ticketValue : null,
      paymentDate: data.paymentDate && data.paymentDate !== "" ? new Date(data.paymentDate) : null,
      paymentMethod: data.paymentMethod || null,
      cardType: data.cardType || null,
      packageId: data.packageId || null,
      venueName: data.venueName || null,
      venueNumber: data.venueNumber || null,
    };
    mutation.mutate(eventData as any);
  };

  const handleClose = () => {
    form.reset();
    setSelectedCharacters([]);
    setSearchTerm("");
    setExpenses([]);
    setNewExpense({ title: "", amount: "", description: "" });
    setShowExpenseForm(false);
    setKmDistance("");
    form.setValue("partyStartTime", "");
    setSelectedEmployees([]);
    setNewEmployee({ employeeId: "", characterId: "", cacheValue: "" });
    setShowEmployeeForm(false);
    onClose();
  };

  const toggleCharacter = useCallback((characterId: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  }, []);

  const removeCharacter = useCallback((characterId: string) => {
    setSelectedCharacters(prev => prev.filter(id => id !== characterId));
  }, []);
  
  const addExpense = useCallback(() => {
    if (!newExpense.title || !newExpense.amount) {
      toast({
        title: "Erro",
        description: "Título e valor são obrigatórios para adicionar uma despesa.",
        variant: "destructive",
      });
      return;
    }
    setExpenses(prev => [...prev, newExpense]);
    setNewExpense({ title: "", amount: "", description: "" });
    setShowExpenseForm(false);
  }, [newExpense, toast]);
  
  const removeExpense = useCallback((index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addEmployee = useCallback(() => {
    if (!newEmployee.employeeId || !newEmployee.cacheValue) {
      toast({
        title: "Erro",
        description: "Selecione um funcionário e informe o valor do cachê.",
        variant: "destructive",
      });
      return;
    }
    setSelectedEmployees(prev => [...prev, newEmployee]);
    setNewEmployee({ employeeId: "", characterId: "", cacheValue: "" });
    setShowEmployeeForm(false);
  }, [newEmployee, toast]);

  const removeEmployee = useCallback((index: number) => {
    setSelectedEmployees(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    form.setValue('cep', cleanCep);
    
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          form.setValue('estado', data.uf || '');
          form.setValue('cidade', data.localidade || '');
          form.setValue('bairro', data.bairro || '');
          form.setValue('rua', data.logradouro || '');
          toast({
            title: "CEP encontrado",
            description: "Endereço preenchido automaticamente!",
          });
        } else {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o CEP digitado e tente novamente.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao buscar CEP",
          description: "Não foi possível consultar o CEP. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoadingCep(false);
      }
    }
  }, [form, toast]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Visualizar Evento" : (isEdit ? "Editar Evento" : "Novo Evento")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? "Informações do evento (somente leitura)" : (isEdit ? "Atualize as informações do evento" : "Cadastre um novo evento")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Título do evento" data-testid="input-event-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente *</FormLabel>
                    <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientPopoverOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-event-client"
                          >
                            {field.value
                              ? clients?.find((client) => client.id === field.value)?.name
                              : "Selecione um cliente"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." data-testid="input-search-client" />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clients?.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.name}
                                  onSelect={() => {
                                    field.onChange(client.id);
                                    setClientPopoverOpen(false);
                                  }}
                                  data-testid={`client-option-${client.id}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === client.id ? "opacity-100" : "opacity-0"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-category">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-event-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Início da Recreação</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" data-testid="input-event-start-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Fim da Recreação</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" data-testid="input-event-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partyStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início da Festa</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" data-testid="input-party-start-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Endereço do Evento</h3>
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
                            maxLength={8}
                            onChange={(e) => handleCepChange(e.target.value)}
                            data-testid="input-event-cep" 
                          />
                          {loadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
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
                        <Input {...field} placeholder="UF" maxLength={2} data-testid="input-event-estado" />
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
                        <Input {...field} placeholder="Nome da cidade" data-testid="input-event-cidade" />
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
                        <Input {...field} placeholder="Nome do bairro" data-testid="input-event-bairro" />
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
                        <Input {...field} placeholder="Nome da rua" data-testid="input-event-rua" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="venueName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Local</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do local do evento" data-testid="input-event-venue-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="venueNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Local</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número" data-testid="input-event-venue-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="deleted">Excluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Distância (km)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={kmDistance}
                  onChange={(e) => {
                    setKmDistance(e.target.value);
                    form.setValue("kmDistance", e.target.value);
                  }}
                  placeholder="0.00"
                  data-testid="input-km-distance"
                />
                {kmTotal > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Valor calculado: R$ {kmTotal.toFixed(2)} ({kmDistance} km × R$ {kmSetting?.value || "0.00"}/km)
                  </p>
                )}
              </div>
            </div>

{canViewFinancials && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Informações de Pagamento</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="ticketValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor da Entrada</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">R$</span>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="pl-10"
                            data-testid="input-event-ticket-value" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {paymentMethod === "cartao_debito" && (
                  <FormField
                    control={form.control}
                    name="cardType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Cartão</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-card-type">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="visa_master">Visa/Master</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Pagamento</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-payment-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="packageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pacote</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-package">
                          <SelectValue placeholder="Selecione o pacote" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packages && packages.length > 0 ? (
                          packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id} data-testid={`package-option-${pkg.id}`}>
                              {pkg.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-packages" disabled>
                            Nenhum pacote cadastrado
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="packageNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação do Pacote</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Observações sobre o pacote..."
                        className="resize-none"
                        rows={2}
                        data-testid="input-package-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <FormLabel>Personagens</FormLabel>
                <p className="text-sm text-muted-foreground mb-3">
                  Busque e selecione os personagens que serão utilizados neste evento
                </p>
                
                {selectedCharacters.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium">
                      Personagens selecionados ({selectedCharacters.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCharacters.map(characterId => {
                        const character = characters.find(c => c.id === characterId);
                        return character ? (
                          <div
                            key={characterId}
                            className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm"
                            data-testid={`selected-character-${characterId}`}
                          >
                            <span>{character.name}</span>
                            <span className="text-xs opacity-75">
                              R$ {parseFloat(character.salePrice || "0").toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCharacter(characterId)}
                              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                              data-testid={`remove-character-${characterId}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar personagens por nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-characters"
                    />
                  </div>

                  <div className="border rounded-md max-h-64 overflow-y-auto">
                    {characters.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          Nenhum personagem cadastrado no estoque
                        </p>
                      </div>
                    ) : filteredCharacters.length === 0 ? (
                      <div className="p-8 text-center">
                        <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum personagem encontrado para "{searchTerm}"
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchTerm("")}
                          className="mt-2"
                          data-testid="button-clear-search"
                        >
                          Limpar busca
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredCharacters.map(character => {
                          const isSelected = selectedCharacters.includes(character.id);
                          return (
                            <div
                              key={character.id}
                              className={`flex items-center justify-between p-3 hover:bg-accent transition-colors ${
                                isSelected ? 'bg-accent/50' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleCharacter(character.id)}
                                  data-testid={`checkbox-character-${character.id}`}
                                />
                                <label 
                                  htmlFor={`char-${character.id}`}
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => toggleCharacter(character.id)}
                                >
                                  <p className="text-sm font-medium truncate">{character.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>R$ {parseFloat(character.salePrice || "0").toFixed(2)}</span>
                                    <span>•</span>
                                    <span>Qtd: {character.quantity}</span>
                                  </div>
                                </label>
                              </div>
                              {!isSelected && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleCharacter(character.id)}
                                  className="ml-2"
                                  data-testid={`add-character-${character.id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {filteredCharacters.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Mostrando {filteredCharacters.length} de {characters.length} personagens
                    </p>
                  )}
                </div>
              </div>

              <div>
                <FormLabel>Despesas Adicionais</FormLabel>
                <p className="text-sm text-muted-foreground mb-3">
                  Adicione despesas extras relacionadas a este evento
                </p>
                
                {expenses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium">
                      Despesas cadastradas ({expenses.length}):
                    </p>
                    <div className="space-y-2">
                      {expenses.map((expense, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-2 bg-accent/50 p-3 rounded-md"
                          data-testid={`expense-item-${index}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{expense.title}</p>
                            <p className="text-sm text-primary font-semibold">
                              R$ {parseFloat(expense.amount).toFixed(2)}
                            </p>
                            {expense.description && (
                              <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExpense(index)}
                            className="hover:bg-destructive/20 text-destructive rounded-full p-1.5 transition-colors"
                            data-testid={`remove-expense-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!showExpenseForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExpenseForm(true)}
                    className="w-full"
                    data-testid="button-show-expense-form"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                ) : (
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Título da Despesa *</label>
                        <Input
                          value={newExpense.title}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Ex: Transporte, Decoração"
                          data-testid="input-expense-title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Valor *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          data-testid="input-expense-amount"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Descrição</label>
                      <Input
                        value={newExpense.description || ""}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Breve descrição da despesa (opcional)"
                        data-testid="input-expense-description"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowExpenseForm(false);
                          setNewExpense({ title: "", amount: "", description: "" });
                        }}
                        className="flex-1"
                        data-testid="button-cancel-expense"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={addExpense}
                        className="flex-1"
                        data-testid="button-add-expense"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Informações adicionais sobre o evento" rows={3} data-testid="input-event-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <FormLabel>Funcionários</FormLabel>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione os funcionários que trabalharão neste evento e informe o cachê
                </p>
                
                {selectedEmployees.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium">
                      Funcionários selecionados ({selectedEmployees.length}):
                    </p>
                    <div className="space-y-2">
                      {selectedEmployees.map((emp, index) => {
                        const employee = employees?.find(e => e.id === emp.employeeId);
                        const character = characters.find(c => c.id === emp.characterId);
                        return employee ? (
                          <div
                            key={index}
                            className="flex items-start justify-between gap-2 bg-accent/50 p-3 rounded-md"
                            data-testid={`employee-item-${index}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.role}</p>
                              {character && (
                                <p className="text-xs text-primary mt-1">
                                  Personagem: {character.name}
                                </p>
                              )}
                              <p className="text-sm text-primary font-semibold mt-1">
                                Cachê: R$ {parseFloat(emp.cacheValue).toFixed(2)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEmployee(index)}
                              className="hover:bg-destructive/20 text-destructive rounded-full p-1.5 transition-colors"
                              data-testid={`remove-employee-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {!showEmployeeForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmployeeForm(true)}
                    className="w-full"
                    data-testid="button-show-employee-form"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Funcionário
                  </Button>
                ) : (
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Funcionário *</label>
                        <Select
                          value={newEmployee.employeeId}
                          onValueChange={(value) => setNewEmployee(prev => ({ ...prev, employeeId: value }))}
                        >
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Selecione o funcionário" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.filter(e => !selectedEmployees.some(se => se.employeeId === e.id)).map(employee => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Personagem</label>
                        <Select
                          value={newEmployee.characterId}
                          onValueChange={(value) => setNewEmployee(prev => ({ ...prev, characterId: value }))}
                          disabled={selectedCharacters.length === 0}
                        >
                          <SelectTrigger data-testid="select-employee-character">
                            <SelectValue placeholder={selectedCharacters.length === 0 ? "Selecione personagens primeiro" : "Selecione o personagem"} />
                          </SelectTrigger>
                          <SelectContent>
                            {characters.filter(c => selectedCharacters.includes(c.id)).map(character => (
                              <SelectItem key={character.id} value={character.id}>
                                {character.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Valor do Cachê *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={newEmployee.cacheValue}
                            onChange={(e) => setNewEmployee(prev => ({ ...prev, cacheValue: e.target.value }))}
                            placeholder="0.00"
                            className="pl-10"
                            data-testid="input-employee-cache"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowEmployeeForm(false);
                          setNewEmployee({ employeeId: "", characterId: "", cacheValue: "" });
                        }}
                        className="flex-1"
                        data-testid="button-cancel-employee"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={addEmployee}
                        className="flex-1"
                        data-testid="button-add-employee"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {canViewFinancials && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Resumo do Contrato</h3>
                <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Personagens ({selectedCharacters.length})</span>
                  <span className="font-medium">R$ {charactersTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Despesas ({expenses.length})</span>
                  <span className="font-medium">R$ {expensesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Funcionários ({selectedEmployees.length})</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">R$ {employeeCacheTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  * Custo interno da empresa (não incluído no valor do contrato)
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Deslocamento ({kmDistance || 0} km)</span>
                  <span className="font-medium">R$ {kmTotal.toFixed(2)}</span>
                </div>
                {(() => {
                  const contractValue = parseFloat(form.watch("contractValue") || "0");
                  const ticketValue = parseFloat(form.watch("ticketValue") || "0");
                  const remainingValue = Math.max(0, contractValue - ticketValue);
                  const numInstallments = parseInt(String(form.watch("installments") || "1"));
                  
                  // Passo 1: Aplicar taxa da operadora sobre o valor restante
                  const feeAmount = remainingValue * (feePercentage / 100);
                  
                  // Valor após aplicar taxa da operadora (valor que será parcelado)
                  const valueToFinance = remainingValue + feeAmount;
                  
                  // Passo 2: Calcular juros compostos se aplicável (Tabela Price)
                  let interestAmount = 0;
                  let installmentValue = 0;
                  let totalFinanced = valueToFinance; // Por padrão, sem juros
                  
                  if (hasInstallmentInterest && monthlyInterestRate > 0 && numInstallments > 1) {
                    const i = monthlyInterestRate / 100; // Taxa em decimal
                    const n = numInstallments;
                    
                    // Fórmula da Tabela Price: PMT = PV × [i × (1 + i)^n] / [(1 + i)^n - 1]
                    const factor = Math.pow(1 + i, n);
                    installmentValue = valueToFinance * (i * factor) / (factor - 1);
                    totalFinanced = installmentValue * n;
                    interestAmount = totalFinanced - valueToFinance;
                  }
                  
                  // Valor total final = entrada + valor financiado (com taxas e juros)
                  const finalTotal = ticketValue + totalFinanced;

                  if (feePercentage > 0 && (paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito") && remainingValue > 0) {
                    return (
                      <>
                        <div className="border-t pt-3 mt-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              Taxa de pagamento ({feePercentage.toFixed(2)}%)
                              {calculatingFee && <span className="ml-2 text-xs">(calculando...)</span>}
                            </span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">R$ {feeAmount.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            * Taxa aplicada sobre o valor restante (R$ {remainingValue.toFixed(2)})
                          </p>
                          
                          {hasInstallmentInterest && monthlyInterestRate > 0 && numInstallments > 1 && interestAmount > 0 && (
                            <>
                              <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-muted-foreground">
                                  Juros ({monthlyInterestRate.toFixed(2)}% a.m. × {numInstallments}x)
                                </span>
                                <span className="font-medium text-orange-600 dark:text-orange-400">R$ {interestAmount.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground italic">
                                * Juros compostos aplicados sobre R$ {valueToFinance.toFixed(2)} (Tabela Price)
                              </p>
                            </>
                          )}
                          
                          <div className="flex justify-between items-center text-sm pt-2 border-t">
                            <span className="font-semibold">
                              Valor Total {feeAmount > 0 ? "com Taxas" : ""}{hasInstallmentInterest && interestAmount > 0 ? " e Juros" : ""}
                            </span>
                            <span className="font-semibold text-lg">R$ {finalTotal.toFixed(2)}</span>
                          </div>
                          
                          {hasInstallmentInterest && monthlyInterestRate > 0 && numInstallments > 1 && interestAmount > 0 && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 rounded p-2 mt-2">
                              <p className="text-xs text-orange-700 dark:text-orange-300">
                                <strong>Valor financiado:</strong> R$ {valueToFinance.toFixed(2)}<br />
                                <strong>Parcelamento:</strong> {numInstallments}x de R$ {installmentValue.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
                <div className="border-t pt-3 mt-3">
                  <FormField
                    control={form.control}
                    name="contractValue"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center gap-4">
                          <FormLabel className="text-base font-semibold mb-0">Valor Total do Contrato *</FormLabel>
                          <FormControl>
                            <div className="relative w-48">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium">R$</span>
                              <Input 
                                {...field} 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                className="pl-10 text-right font-semibold text-lg"
                                data-testid="input-event-value" 
                              />
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  O valor é calculado automaticamente, mas você pode ajustá-lo se necessário.
                </p>
                
                <div className="border-t pt-3 mt-3">
                  <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => {
                      const contractValue = parseFloat(form.watch("contractValue") || "0");
                      const ticketValue = parseFloat(form.watch("ticketValue") || "0");
                      const installments = parseInt(field.value?.toString() || "1");
                      const remainingValue = contractValue - ticketValue;
                      
                      // Calcular o valor correto da parcela incluindo taxas e juros
                      let calculatedInstallmentValue = 0;
                      
                      if (installments > 0 && remainingValue > 0) {
                        // Aplicar taxa da operadora sobre o valor restante
                        const feeAmount = remainingValue * (feePercentage / 100);
                        const valueToFinance = remainingValue + feeAmount;
                        
                        // Verificar se tem juros compostos (Tabela Price)
                        if (hasInstallmentInterest && monthlyInterestRate > 0 && installments > 1) {
                          const i = monthlyInterestRate / 100;
                          const n = installments;
                          const factor = Math.pow(1 + i, n);
                          calculatedInstallmentValue = valueToFinance * (i * factor) / (factor - 1);
                        } else {
                          // Sem juros compostos: dividir valor com taxa pelo número de parcelas
                          calculatedInstallmentValue = valueToFinance / installments;
                        }
                      }
                      
                      return (
                        <FormItem>
                          <div className="flex justify-between items-center gap-4">
                            <FormLabel className="text-sm font-medium mb-0">Quantidade de Parcelas</FormLabel>
                            <FormControl>
                              <div className="w-32">
                                <Input 
                                  {...field}
                                  value={field.value ?? ""}
                                  type="number" 
                                  min="1"
                                  max="12"
                                  placeholder="1" 
                                  className="text-right"
                                  data-testid="input-installments" 
                                />
                              </div>
                            </FormControl>
                          </div>
                          {installments > 0 && remainingValue > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <p>Valor restante: R$ {remainingValue.toFixed(2)}</p>
                              <p className="font-medium text-foreground">
                                {installments}x de R$ {calculatedInstallmentValue.toFixed(2)}
                              </p>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                {isReadOnly ? "Fechar" : "Cancelar"}
              </Button>
              {canEdit && (
              <Button type="submit" disabled={mutation.isPending || calculatingFee} data-testid="button-save-event">
                {(mutation.isPending || calculatingFee) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
