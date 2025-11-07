import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEventSchema, type Event, type Client, type Employee, type InventoryItem, type EventCategory } from "@shared/schema";
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
import { Loader2, X, Search, Plus } from "lucide-react";

const eventFormSchema = insertEventSchema.extend({
  notes: z.string().optional(),
  date: z.string(),
  cep: z.string().optional(),
  estado: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  rua: z.string().optional(),
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

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
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
      contractValue: "0",
      status: "scheduled",
      notes: "",
      characterIds: [],
    },
  });

  useEffect(() => {
    if (open && event) {
      form.reset({
        title: event.title || "",
        clientId: event.clientId || "",
        categoryId: event.categoryId || undefined,
        date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
        cep: (event as any).cep || "",
        estado: (event as any).estado || "",
        cidade: (event as any).cidade || "",
        bairro: (event as any).bairro || "",
        rua: (event as any).rua || "",
        contractValue: event.contractValue || "0",
        status: event.status || "scheduled",
        notes: event.notes || "",
        characterIds: [],
      });
      setSelectedCharacters((event as any).characterIds || []);
      setExpenses((event as any).expenses || []);
    } else if (open && !event) {
      form.reset({
        title: "",
        clientId: "",
        categoryId: undefined,
        date: "",
        cep: "",
        estado: "",
        cidade: "",
        bairro: "",
        rua: "",
        contractValue: "0",
        status: "scheduled",
        notes: "",
        characterIds: [],
      });
      setSelectedCharacters([]);
      setExpenses([]);
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

  useEffect(() => {
    const total = charactersTotal + expensesTotal;
    form.setValue("contractValue", total.toFixed(2), { shouldValidate: false, shouldDirty: false });
  }, [charactersTotal, expensesTotal, form]);

  const mutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const payload = {
        ...data,
        characterIds: selectedCharacters,
        expenses: expenses,
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
    const eventData = {
      ...data,
      date: new Date(data.date),
      categoryId: data.categoryId || undefined,
    };
    mutation.mutate(eventData as any);
  };

  const handleClose = () => {
    form.reset();
    setSelectedCharacters([]);
    setSearchTerm("");
    setExpenses([]);
    setNewExpense({ title: "", amount: "", description: "" });
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
  }, [newExpense, toast]);
  
  const removeExpense = useCallback((index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
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
          <DialogTitle>{isEdit ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações do evento" : "Cadastre um novo evento"}
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
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-client">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
                    <FormLabel>Data e Hora *</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" data-testid="input-event-date" />
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExpense}
                    className="w-full"
                    data-testid="button-add-expense"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                </div>
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
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-event">
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
