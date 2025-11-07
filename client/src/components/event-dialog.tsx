import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEventSchema, type Event, type Client, type Employee, type InventoryItem, type EventCategory } from "@shared/schema";
import { z } from "zod";
import { useState, useEffect } from "react";
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
  characterIds: z.array(z.string()).optional(),
});

type EventForm = z.infer<typeof eventFormSchema>;

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

  const characters = inventoryItems?.filter(item => item.type === "character") || [];
  
  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const form = useForm<EventForm>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      clientId: event?.clientId || "",
      categoryId: event?.categoryId || undefined,
      date: event?.date ? new Date(event.date).toISOString().slice(0, 16) : "",
      location: event?.location || "",
      contractValue: event?.contractValue || "0",
      status: event?.status || "scheduled",
      notes: event?.notes || "",
      characterIds: [],
    },
  });

  useEffect(() => {
    if (event && (event as any).characterIds) {
      setSelectedCharacters((event as any).characterIds);
    } else {
      setSelectedCharacters([]);
    }
  }, [event]);

  useEffect(() => {
    if (characters.length > 0 && selectedCharacters.length > 0) {
      const total = selectedCharacters.reduce((sum, characterId) => {
        const character = characters.find(c => c.id === characterId);
        const price = character?.salePrice ? parseFloat(character.salePrice) : 0;
        return sum + price;
      }, 0);
      form.setValue("contractValue", total.toFixed(2), { shouldValidate: false, shouldDirty: false });
    }
  }, [selectedCharacters, characters]);

  const mutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const payload = {
        ...data,
        characterIds: selectedCharacters,
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
    onClose();
  };

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  const removeCharacter = (characterId: string) => {
    setSelectedCharacters(prev => prev.filter(id => id !== characterId));
  };

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
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Endereço do evento" data-testid="input-event-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Contrato *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-event-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                              className={`flex items-center justify-between p-3 hover:bg-accent transition-colors cursor-pointer ${
                                isSelected ? 'bg-accent/50' : ''
                              }`}
                              onClick={() => toggleCharacter(character.id)}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleCharacter(character.id)}
                                  data-testid={`checkbox-character-${character.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{character.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>R$ {parseFloat(character.salePrice || "0").toFixed(2)}</span>
                                    <span>•</span>
                                    <span>Qtd: {character.quantity}</span>
                                  </div>
                                </div>
                              </div>
                              {!isSelected && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCharacter(character.id);
                                  }}
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
