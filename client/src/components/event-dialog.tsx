import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEventSchema, type Event, type Client, type Employee, type InventoryItem, type EventCategory, type Package, type Buffet } from "@shared/schema";
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
  eventDuration: z.string().optional(),
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
  packageIds: z.array(z.string()).optional().default([]),
  serviceId: z.string().optional(),
  eventType: z.enum(["package", "service", "both"]).default("package"),
  packageNotes: z.string().optional(),
  childrenCount: z.string().optional(),
  buffetId: z.string().optional(),
  characterIds: z.array(z.string()).optional(),
  expenses: z.array(z.object({
    title: z.string(),
    amount: z.string(),
    description: z.string().optional(),
  })).optional(),
  installments: z.coerce.number().int().min(1).optional(),
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
  const [eventInstallments, setEventInstallments] = useState<Array<{ amount: string, paymentDate: string, paymentMethod: string }>>([]);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [newInstallment, setNewInstallment] = useState<{ amount: string, paymentDate: string, paymentMethod: string }>({ amount: "", paymentDate: "", paymentMethod: "" });
  const [kmDistance, setKmDistance] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Array<{ employeeId: string; characterId: string; cacheValue: string }>>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState<{ employeeId: string; characterId: string; cacheValue: string }>({ employeeId: "", characterId: "", cacheValue: "" });
  const [feePercentage, setFeePercentage] = useState<number>(0);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(0);
  const [hasInstallmentInterest, setHasInstallmentInterest] = useState(false);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [packagePopoverOpen, setPackagePopoverOpen] = useState(false);
  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [buffetSearchTerm, setBuffetSearchTerm] = useState("");
  const [methodPopoverOpen, setMethodPopoverOpen] = useState(false);
  const [cardPopoverOpen, setCardPopoverOpen] = useState(false);
  const [installmentMethodPopoverOpen, setInstallmentMethodPopoverOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || 'employee';
  const isAdmin = userRole === 'admin' || userRole === 'secretaria';
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

  const { data: buffets } = useQuery<Buffet[]>({
    queryKey: ["/api/buffets"],
    enabled: open,
  });

  const filteredBuffets = useMemo(() =>
    buffets?.filter(b =>
      b.name.toLowerCase().includes(buffetSearchTerm.toLowerCase())
    ) || [],
    [buffets, buffetSearchTerm]
  );

  const filteredPackages = useMemo(() =>
    packages?.filter(p =>
      p.name.toLowerCase().includes(packageSearchTerm.toLowerCase())
    ) || [],
    [packages, packageSearchTerm]
  );

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
      packageIds: [],
      serviceId: "",
      eventType: "package",
      buffetId: "",
      packageNotes: "",
      status: "scheduled",
      notes: "",
      characterIds: [],
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const cardType = form.watch("cardType");
  const installments = form.watch("installments");

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

  const { data: services } = useQuery<any[]>({
    queryKey: ["/api/settings/services"],
    enabled: open,
  });

  const eventType = form.watch("eventType");
  const contractValue = form.watch("contractValue");

  const totalPaid = useMemo(() => {
    const installmentsTotal = (eventInstallments || []).reduce((sum, inst) => sum + parseFloat(inst?.amount || "0"), 0);
    const entryValue = parseFloat(form.getValues("ticketValue") || "0");
    return installmentsTotal + entryValue;
  }, [eventInstallments, form.watch("ticketValue")]);

  const pendingValue = useMemo(() => {
    const total = parseFloat(contractValue || "0");
    return Math.max(0, total - totalPaid);
  }, [contractValue, totalPaid]);

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
        eventDuration: (event as any).eventDuration || "",
        childrenCount: (event as any).childrenCount?.toString() || "",
        startTime: (event as any).startTime || (event.date ? (() => {
          const d = new Date(event.date);
          if (d.getHours() === 0 && d.getMinutes() === 0) return "";
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })() : ""),
        endTime: (event as any).endTime || (event.date ? (() => {
          const d = new Date(event.date);
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
        packageIds: (event as any).packageIds || [],
        serviceId: (event as any).serviceId || "",
        eventType: (event as any).eventType || "package",
        packageNotes: (event as any).packageNotes || "",
        buffetId: (event as any).buffetId || "",
        status: event.status || "scheduled",
        notes: event.notes || "",
        characterIds: [],
      });
      setSelectedCharacters((event as any).characterIds || []);
      const loadedExpenses = (event as any).expenses || [];
      setExpenses(loadedExpenses.map((exp: any) => ({
        title: exp.title || "",
        amount: exp.amount?.toString() || "0",
        description: exp.description || ""
      })));
      setKmDistance((event as any).kmDistance || "");
      setEventInstallments((event as any).eventInstallments?.map((inst: any) => ({
        amount: inst.amount?.toString() || "0",
        paymentDate: inst.paymentDate ? new Date(inst.paymentDate).toISOString().slice(0, 10) : "",
        paymentMethod: inst.paymentMethod || ""
      })) || []);
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
        childrenCount: "",
        contractValue: "0",
        ticketValue: "",
        paymentMethod: "",
        cardType: "",
        installments: 1,
        paymentDate: "",
        packageIds: [],
        serviceId: "",
        eventType: "package",
        buffetId: "",
        packageNotes: "",
        partyStartTime: "",
        eventDuration: "",
        status: "scheduled" as const,
        notes: "",
        characterIds: [],
      });
      setSelectedCharacters([]);
      setExpenses([]);
      setKmDistance("");
      setEventInstallments([]);
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
    if (!isEdit || form.getValues("contractValue") === "0") {
      const total = charactersTotal + expensesTotal + kmTotal;
      form.setValue("contractValue", total.toFixed(2), { shouldValidate: false, shouldDirty: false });
    }
  }, [charactersTotal, expensesTotal, kmTotal, form, isEdit]);

  const mutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const payload = {
        ...data,
        characterIds: selectedCharacters,
        expenses: expenses,
        eventInstallments: eventInstallments,
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
      childrenCount: data.childrenCount ? parseInt(data.childrenCount) : null,
      partyStartTime: data.partyStartTime || null,
      eventDuration: data.eventDuration || null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      categoryId: data.categoryId || undefined,
      kmDistance: data.kmDistance && data.kmDistance !== "" ? data.kmDistance : null,
      ticketValue: data.ticketValue && data.ticketValue !== "" ? data.ticketValue : null,
      paymentDate: data.paymentDate && data.paymentDate !== "" ? new Date(data.paymentDate) : null,
      paymentMethod: data.paymentMethod || null,
      cardType: data.cardType || null,
      packageIds: data.packageIds || [],
      serviceId: data.serviceId || null,
      eventType: data.eventType || "package",
      buffetId: data.buffetId || null,
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
    setSelectedEmployees(prev => [...prev, {
      ...newEmployee,
      characterId: newEmployee.characterId === "none" ? "" : newEmployee.characterId
    }]);
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
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>{isReadOnly ? "Visualizar Evento" : (isEdit ? "Editar Evento" : "Novo Evento")}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? "Informações do evento (somente leitura)" : (isEdit ? "Atualize as informações do evento" : "Cadastre um novo evento")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
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
                              type="button"
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Categoria</FormLabel>
                      <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-event-category"
                            >
                              {field.value
                                ? categories?.find((c) => c.id === field.value)?.name
                                : "Selecione uma categoria"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar categoria..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                              <CommandGroup>
                                {categories?.map((category) => (
                                  <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={() => {
                                      field.onChange(category.id);
                                      setCategoryPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === category.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {category.name}
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
                  name="eventDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração do Evento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 4 horas" data-testid="input-event-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="childrenCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade de Crianças</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="0" data-testid="input-children-count" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buffetId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Buffet</FormLabel>
                      <div className="space-y-2">
                        <Input
                          placeholder="Pesquisar buffets..."
                          value={buffetSearchTerm}
                          onChange={(e) => setBuffetSearchTerm(e.target.value)}
                          className="h-8"
                          data-testid="input-search-buffets"
                        />
                        <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto" data-testid="select-event-buffet">
                          {filteredBuffets.length === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhum buffet encontrado.</p>
                          )}
                          {filteredBuffets.map((b) => {
                            const isSelected = field.value === b.id;
                            return (
                              <div
                                key={b.id}
                                className={cn(
                                  "flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                                  isSelected && "bg-accent"
                                )}
                                onClick={() => {
                                  if (!isReadOnly) {
                                    field.onChange(isSelected ? "" : b.id);
                                  }
                                }}
                                data-testid={`buffet-option-${b.id}`}
                              >
                                <Check
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium">{b.name}</span>
                                  {b.address && (
                                    <p className="text-xs text-muted-foreground truncate">{b.address}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Evento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="package">Pacote</SelectItem>
                          <SelectItem value="service">Serviço</SelectItem>
                          <SelectItem value="both">Ambos (Pacote e Serviço)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(eventType === "package" || eventType === "both") && (
                  <>
                    <FormField
                      control={form.control}
                      name="packageIds"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Pacotes</FormLabel>
                          <div className="space-y-2">
                            <Input
                              placeholder="Pesquisar pacotes..."
                              value={packageSearchTerm}
                              onChange={(e) => setPackageSearchTerm(e.target.value)}
                              className="h-8"
                              data-testid="input-search-packages"
                            />
                            <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto" data-testid="select-event-packages">
                              {filteredPackages.length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhum pacote encontrado.</p>
                              )}
                              {filteredPackages.map((p) => {
                                const isSelected = field.value?.includes(p.id) || false;
                                return (
                                  <div key={p.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`package-${p.id}`}
                                      checked={isSelected}
                                      disabled={isReadOnly}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          form.setValue("packageIds", [...currentValues, p.id]);
                                        } else {
                                          form.setValue("packageIds", currentValues.filter((id: string) => id !== p.id));
                                        }
                                      }}
                                      data-testid={`checkbox-package-${p.id}`}
                                    />
                                    <label
                                      htmlFor={`package-${p.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      {p.name}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
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
                  </>
                )}

                {(eventType === "service" || eventType === "both") && (
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isReadOnly}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Status *</FormLabel>
                      <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                              data-testid="select-event-status"
                            >
                              {field.value === "scheduled" ? "Agendado" :
                                field.value === "rescheduled" ? "Reagendado" :
                                  field.value === "completed" ? "Concluído" :
                                    field.value === "cancelled" ? "Cancelado" :
                                      field.value === "deleted" ? "Excluído" : "Selecione o status"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar status..." />
                            <CommandList>
                              <CommandGroup>
                                {[
                                  { value: "scheduled", label: "Agendado" },
                                  { value: "rescheduled", label: "Reagendado" },
                                  { value: "completed", label: "Concluído" },
                                  { value: "cancelled", label: "Cancelado" },
                                  { value: "deleted", label: "Excluído" }
                                ].map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.label}
                                    onSelect={() => {
                                      field.onChange(item.value);
                                      setStatusPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === item.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {item.label}
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
                        <FormItem className="flex flex-col">
                          <FormLabel>Forma de Pagamento</FormLabel>
                          <Popover open={methodPopoverOpen} onOpenChange={setMethodPopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="select-payment-method"
                                >
                                  {field.value === "dinheiro" ? "Dinheiro" :
                                    field.value === "pix" ? "PIX" :
                                      field.value === "cartao_credito" ? "Cartão de Crédito" :
                                        field.value === "cartao_debito" ? "Cartão de Débito" : "Selecione"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar forma..." />
                                <CommandList>
                                  <CommandGroup>
                                    {[
                                      { value: "dinheiro", label: "Dinheiro" },
                                      { value: "pix", label: "PIX" },
                                      { value: "cartao_credito", label: "Cartão de Crédito" },
                                      { value: "cartao_debito", label: "Cartão de Débito" }
                                    ].map((item) => (
                                      <CommandItem
                                        key={item.value}
                                        value={item.label}
                                        onSelect={() => {
                                          field.onChange(item.value);
                                          setMethodPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === item.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {item.label}
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
                    {paymentMethod === "cartao_debito" && (
                      <FormField
                        control={form.control}
                        name="cardType"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tipo de Cartão</FormLabel>
                            <Popover open={cardPopoverOpen} onOpenChange={setCardPopoverOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="select-card-type"
                                  >
                                    {field.value === "visa_master" ? "Visa/Master" :
                                      field.value === "outros" ? "Outros" : "Selecione"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar tipo..." />
                                  <CommandList>
                                    <CommandGroup>
                                      {[
                                        { value: "visa_master", label: "Visa/Master" },
                                        { value: "outros", label: "Outros" }
                                      ].map((item) => (
                                        <CommandItem
                                          key={item.value}
                                          value={item.label}
                                          onSelect={() => {
                                            field.onChange(item.value);
                                            setCardPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === item.value ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {item.label}
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

                  <div className="space-y-4 border rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Parcelas Pagas</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInstallmentForm(!showInstallmentForm)}
                        data-testid="button-add-installment"
                      >
                        {showInstallmentForm ? "Cancelar" : "Adicionar Parcela"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-2 border-b">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Valor do Contrato</p>
                        <p className="text-sm font-semibold text-primary">R$ {parseFloat(contractValue || "0").toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Total Pago</p>
                        <p className="text-sm font-semibold text-green-600">R$ {totalPaid.toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Pendente</p>
                        <p className={`text-sm font-semibold ${pendingValue > 0 ? "text-destructive" : "text-green-600"}`}>
                          R$ {pendingValue.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {showInstallmentForm && (
                      <div className="grid gap-4 p-4 border rounded-md bg-muted/50">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <FormLabel>Valor</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={newInstallment.amount}
                              onChange={(e) => setNewInstallment({ ...newInstallment, amount: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <FormLabel>Data</FormLabel>
                            <Input
                              type="date"
                              value={newInstallment.paymentDate}
                              onChange={(e) => setNewInstallment({ ...newInstallment, paymentDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2 flex flex-col">
                            <FormLabel>Forma</FormLabel>
                            <Popover open={installmentMethodPopoverOpen} onOpenChange={setInstallmentMethodPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !newInstallment.paymentMethod && "text-muted-foreground"
                                  )}
                                >
                                  {newInstallment.paymentMethod === "dinheiro" ? "Dinheiro" :
                                    newInstallment.paymentMethod === "pix" ? "PIX" :
                                      newInstallment.paymentMethod === "cartao_credito" ? "Cartão de Crédito" :
                                        newInstallment.paymentMethod === "cartao_debito" ? "Cartão de Débito" : "Selecione"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar forma..." />
                                  <CommandList>
                                    <CommandGroup>
                                      {[
                                        { value: "dinheiro", label: "Dinheiro" },
                                        { value: "pix", label: "PIX" },
                                        { value: "cartao_credito", label: "Cartão de Crédito" },
                                        { value: "cartao_debito", label: "Cartão de Débito" }
                                      ].map((item) => (
                                        <CommandItem
                                          key={item.value}
                                          value={item.label}
                                          onSelect={() => {
                                            setNewInstallment({ ...newInstallment, paymentMethod: item.value });
                                            setInstallmentMethodPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              newInstallment.paymentMethod === item.value ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {item.label}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!newInstallment.amount || !newInstallment.paymentDate || !newInstallment.paymentMethod) {
                              toast({ title: "Erro", description: "Preencha todos os campos da parcela.", variant: "destructive" });
                              return;
                            }
                            setEventInstallments([...eventInstallments, newInstallment]);
                            setNewInstallment({ amount: "", paymentDate: "", paymentMethod: "" });
                            setShowInstallmentForm(false);
                          }}
                        >
                          Confirmar Parcela
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {eventInstallments.map((inst, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-background">
                          <div className="text-sm">
                            <span className="font-medium">R$ {parseFloat(inst?.amount || "0").toFixed(2)}</span>
                            <span className="mx-2">•</span>
                            <span>{inst?.paymentDate ? new Date(inst.paymentDate).toLocaleDateString("pt-BR") : ""}</span>
                            <span className="mx-2">•</span>
                            <span className="capitalize">{(inst?.paymentMethod || "").replace("_", " ")}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEventInstallments(eventInstallments.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {eventInstallments.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhuma parcela registrada</p>
                      )}
                    </div>
                  </div>
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
                        data-testid="input-search-character"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-1 border rounded-md bg-muted/50">
                      {filteredCharacters.map(character => {
                        const isSelected = selectedCharacters.includes(character.id);
                        return (
                          <button
                            key={character.id}
                            type="button"
                            onClick={() => toggleCharacter(character.id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-transparent"
                            )}
                            data-testid={`character-option-${character.id}`}
                          >
                            <span className="text-xs font-medium truncate w-full">{character.name}</span>
                            <span className={cn(
                              "text-[10px] opacity-75",
                              isSelected ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
                              R$ {parseFloat(character.salePrice || "0").toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                      {filteredCharacters.length === 0 && (
                        <div className="col-span-full py-6 text-center text-sm text-muted-foreground">
                          {searchTerm ? "Nenhum personagem encontrado" : "Carregando personagens..."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Colaboradores & Cachês</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmployeeForm(!showEmployeeForm)}
                      data-testid="button-add-employee"
                    >
                      {showEmployeeForm ? "Cancelar" : "Adicionar Colaborador"}
                    </Button>
                  </div>

                  {selectedEmployees.length > 0 && (
                    <div className="space-y-2">
                      {selectedEmployees.map((emp, index) => {
                        const employee = employees?.find(e => e.id === emp.employeeId);
                        const character = characters.find(c => c.id === emp.characterId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-background">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{employee?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {character ? `Personagem: ${character.name}` : "Geral"} • Cachê: R$ {parseFloat(emp.cacheValue || "0").toFixed(2)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEmployee(index)}
                              data-testid={`remove-employee-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showEmployeeForm && (
                    <div className="grid gap-4 p-4 border rounded-md bg-muted/50">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FormLabel>Colaborador</FormLabel>
                          <Select
                            value={newEmployee.employeeId}
                            onValueChange={(val) => setNewEmployee({ ...newEmployee, employeeId: val })}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-employee">
                                <SelectValue placeholder="Selecione o funcionário" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees?.filter(e => !selectedEmployees.some(se => se.employeeId === e.id && !se.characterId)).map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>Personagem (Opcional)</FormLabel>
                          <Select
                            value={newEmployee.characterId}
                            onValueChange={(val) => setNewEmployee({ ...newEmployee, characterId: val })}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-employee-character">
                                <SelectValue placeholder="Selecione o personagem" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Geral (Sem personagem)</SelectItem>
                              {selectedCharacters.map(characterId => {
                                const character = characters.find(c => c.id === characterId);
                                return character ? (
                                  <SelectItem key={characterId} value={characterId}>
                                    {character.name}
                                  </SelectItem>
                                ) : null;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Valor do Cachê</FormLabel>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={newEmployee.cacheValue}
                            onChange={(e) => setNewEmployee({ ...newEmployee, cacheValue: e.target.value })}
                            placeholder="0.00"
                            className="pl-10"
                            data-testid="input-employee-cache"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={addEmployee}
                        data-testid="button-confirm-employee"
                      >
                        Confirmar Colaborador
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Soma de Personagens</span>
                      <span className="text-sm font-medium">R$ {charactersTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Soma de Outros Gastos</span>
                      <span className="text-sm font-medium">R$ {expensesTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Soma de Cachês</span>
                      <span className="text-sm font-medium">R$ {employeeCacheTotal.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase">Custo Total Previsto</span>
                      <span className="text-sm font-bold text-destructive">R$ {(expensesTotal + employeeCacheTotal).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Valor do Contrato</span>
                      <span className="text-sm font-medium">R$ {parseFloat(contractValue || "0").toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Deslocamento</span>
                      <span className="text-sm font-medium">R$ {kmTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Taxa Maquininha ({feePercentage}%)</span>
                      <span className="text-sm font-medium">
                        {paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito" ? (
                          <>R$ {(parseFloat(contractValue || "0") * (feePercentage / 100)).toFixed(2)}</>
                        ) : (
                          "R$ 0.00"
                        )}
                      </span>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase">Lucro Bruto Previsto</span>
                      {calculatingFee ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-sm font-bold text-green-600">
                          R$ {(
                            parseFloat(contractValue || "0") -
                            (expensesTotal + employeeCacheTotal) -
                            (paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito" ? parseFloat(contractValue || "0") * (feePercentage / 100) : 0)
                          ).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {hasInstallmentInterest && monthlyInterestRate > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Atenção:</strong> Este parcelamento possui juros mensais de {monthlyInterestRate}%.
                      O valor total a ser pago pelo cliente será maior que o valor do contrato.
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="contractValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor do Contrato (Manual)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold">R$</span>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-10 text-lg font-bold text-primary"
                            data-testid="input-contract-value"
                          />
                        </div>
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Este valor é calculado automaticamente, mas pode ser alterado manualmente.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {(paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito") && (
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={field.value?.toString() || "1"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-installments">
                                <SelectValue placeholder="1x" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[...Array(12)].map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}x
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {paymentMethod === "cartao_credito" && (
                    <div className="p-3 border rounded-md bg-muted/20 flex flex-col justify-center">
                      <span className="text-xs text-muted-foreground uppercase">Encargo do Parcelamento</span>
                      {calculatingFee ? (
                        <Loader2 className="h-4 w-4 animate-spin mt-1" />
                      ) : (
                        <span className="text-sm font-medium">
                          {hasInstallmentInterest ? (
                            <span className="text-blue-600 font-bold">Juros mensais de {monthlyInterestRate}%</span>
                          ) : (
                            "Parcelamento sem juros extras"
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Outros Gastos (Logística, Insumos, etc)</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                    data-testid="button-add-expense"
                  >
                    {showExpenseForm ? "Cancelar" : "Adicionar Gasto"}
                  </Button>
                </div>

                {expenses.length > 0 && (
                  <div className="space-y-2">
                    {expenses.map((expense, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-background">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {parseFloat(expense.amount || "0").toFixed(2)} {expense.description && `• ${expense.description}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExpense(index)}
                          data-testid={`remove-expense-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {showExpenseForm && (
                  <div className="grid gap-4 p-4 border rounded-md bg-muted/50">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FormLabel>Título</FormLabel>
                        <Input
                          value={newExpense.title}
                          onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                          placeholder="Ex: Combustível, Alimentação"
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Valor</FormLabel>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                            placeholder="0.00"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <Input
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        placeholder="Mais detalhes sobre o gasto..."
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addExpense}
                      data-testid="button-confirm-expense"
                    >
                      Confirmar Gasto
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Observações gerais sobre o evento..."
                          className="resize-none"
                          rows={3}
                          data-testid="input-event-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="p-6 border-t shrink-0 flex justify-end gap-2 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-event"
              >
                Cancelar
              </Button>
              {!isReadOnly && (
                <Button
                  type="submit"
                  disabled={mutation.isPending || calculatingFee}
                  data-testid="button-save-event"
                >
                  {(mutation.isPending || calculatingFee) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Salvar Alterações" : "Criar Evento"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
