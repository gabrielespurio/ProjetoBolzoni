import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertInventoryItemSchema, type InventoryItem } from "@shared/schema";
import { z } from "zod";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2 } from "lucide-react";

const inventoryFormSchema = insertInventoryItemSchema.extend({
  costPrice: z.string().optional(),
  notes: z.string().optional(),
  parentId: z.string().optional(),
  partType: z.string().optional().nullable(),
  accessoryType: z.string().optional(),
  componentIds: z.array(z.string()).optional(),
});

type InventoryForm = z.infer<typeof inventoryFormSchema>;

interface InventoryDialogProps {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}

export function InventoryDialog({ open, onClose, item }: InventoryDialogProps) {
  const { toast } = useToast();
  const isEdit = !!item;

  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [componentSearchTerm, setComponentSearchTerm] = useState("");

  const { data: characters } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    select: (items) => items.filter(i => i.type === "character"),
  });

  const { data: parts } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    select: (items) => items.filter(i => i.type === "part"),
  });

  const { data: accessories } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    select: (items) => items.filter(i => i.type === "accessory"),
  });

  const [componentTab, setComponentTab] = useState<"parts" | "accessories">("parts");

  const filteredParts = useMemo(() => {
    return parts?.filter(item => 
      item.name.toLowerCase().includes(componentSearchTerm.toLowerCase())
    ) || [];
  }, [parts, componentSearchTerm]);

  const filteredAccessories = useMemo(() => {
    return accessories?.filter(item => 
      item.name.toLowerCase().includes(componentSearchTerm.toLowerCase())
    ) || [];
  }, [accessories, componentSearchTerm]);

  const form = useForm<InventoryForm>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      type: "character",
      quantity: 0,
      minQuantity: 0,
      costPrice: "",
      notes: "",
      parentId: undefined,
      accessoryType: "",
    },
  });

  const selectedType = form.watch("type");

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          type: item.type,
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          costPrice: item.costPrice?.toString() || "",
          notes: item.notes || "",
          parentId: item.parentId || undefined,
          partType: item.partType as any || undefined,
          accessoryType: item.accessoryType || "",
          componentIds: (item as any).characterComponents?.map((cc: any) => cc.componentId) || [],
        });
        setSelectedComponents((item as any).characterComponents?.map((cc: any) => cc.componentId) || []);
      } else {
        form.reset({
          name: "",
          type: "character",
          quantity: 0,
          minQuantity: 0,
          costPrice: "",
          notes: "",
          parentId: undefined,
          partType: undefined,
          accessoryType: "",
          componentIds: [],
        });
        setSelectedComponents([]);
      }
    }
  }, [open, item, form]);

  const mutation = useMutation({
    mutationFn: async (data: InventoryForm) => {
      const payload = {
        ...data,
        componentIds: selectedComponents,
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/inventory/${item.id}`, payload);
      } else {
        return apiRequest("POST", "/api/inventory", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: isEdit ? "Item atualizado" : "Item criado",
        description: isEdit ? "Item atualizado com sucesso." : "Novo item cadastrado com sucesso.",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o item.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InventoryForm) => {
    const cleanedData = {
      ...data,
      costPrice: data.costPrice && data.costPrice !== "" ? data.costPrice : undefined,
      notes: data.notes && data.notes !== "" ? data.notes : undefined,
      parentId: data.parentId === "none" ? undefined : data.parentId,
    };
    mutation.mutate(cleanedData);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Item" : "Novo Item"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações do item" : "Cadastre um novo item no estoque"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do item" data-testid="input-item-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="character">Personagem Completo</SelectItem>
                        <SelectItem value="part">Peça</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="accessory">Acessório</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedType === "character" && (
                <div className="md:col-span-2 space-y-4">
                  <FormLabel>Componentes do Personagem</FormLabel>
                  <Tabs value={componentTab} onValueChange={(v) => setComponentTab(v as "parts" | "accessories")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="parts" data-testid="tab-parts">
                        Peças ({filteredParts.length})
                      </TabsTrigger>
                      <TabsTrigger value="accessories" data-testid="tab-accessories">
                        Acessórios ({filteredAccessories.length})
                      </TabsTrigger>
                    </TabsList>
                    <div className="mt-2">
                      <Input
                        placeholder={componentTab === "parts" ? "Pesquisar peças..." : "Pesquisar acessórios..."}
                        value={componentSearchTerm}
                        onChange={(e) => setComponentSearchTerm(e.target.value)}
                        className="h-8"
                        data-testid="input-search-components"
                      />
                    </div>
                    <TabsContent value="parts" className="mt-2">
                      <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                        {filteredParts.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma peça encontrada.
                          </p>
                        )}
                        {filteredParts.map((part) => {
                          const isSelected = selectedComponents.includes(part.id);
                          return (
                            <div key={part.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`part-${part.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedComponents(prev => [...prev, part.id]);
                                  } else {
                                    setSelectedComponents(prev => prev.filter(id => id !== part.id));
                                  }
                                }}
                                data-testid={`checkbox-part-${part.id}`}
                              />
                              <label
                                htmlFor={`part-${part.id}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {part.name}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                    <TabsContent value="accessories" className="mt-2">
                      <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                        {filteredAccessories.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum acessório encontrado.
                          </p>
                        )}
                        {filteredAccessories.map((accessory) => {
                          const isSelected = selectedComponents.includes(accessory.id);
                          return (
                            <div key={accessory.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`accessory-${accessory.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedComponents(prev => [...prev, accessory.id]);
                                  } else {
                                    setSelectedComponents(prev => prev.filter(id => id !== accessory.id));
                                  }
                                }}
                                data-testid={`checkbox-accessory-${accessory.id}`}
                              />
                              <label
                                htmlFor={`accessory-${accessory.id}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {accessory.name}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              {selectedType === "accessory" && (
                <FormField
                  control={form.control}
                  name="accessoryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo do Acessório</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o tipo do acessório" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedType === "part" && (
                <>
                  <FormField
                    control={form.control}
                    name="partType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Peça *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite o tipo de peça" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pertence ao Personagem</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um personagem" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum (Peça avulsa)</SelectItem>
                            {characters?.map((char) => (
                              <SelectItem key={char.id} value={char.id}>
                                {char.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-item-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-item-min-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Custo</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-item-cost-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Informações adicionais sobre o item" rows={3} data-testid="input-item-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-item">
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
