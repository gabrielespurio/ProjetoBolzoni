import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, AlertTriangle, MoreHorizontal, Pencil, Trash2, Package, Ruler, Scissors, Box } from "lucide-react";
import { InventoryDialog } from "@/components/inventory-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import type { InventoryItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("character");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });
  const { toast } = useToast();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === 'admin';
  const isSecretaria = user?.role === 'secretaria';
  const canEdit = isAdmin || isSecretaria;

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/inventory/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Item excluído",
        description: "Item removido do estoque com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir item.",
        variant: "destructive",
      });
    },
  });

  const filteredItems = useMemo(() => {
    let result = items || [];
    
    result = filterByDateRange(result, "createdAt", dateFilter);
    
    result = result.filter((item) =>
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())) &&
      (activeTab === "all" || item.type === activeTab)
    );
    
    return result;
  }, [items, search, dateFilter, activeTab]);

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (itemId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      deleteMutation.mutate(itemId);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
  };

  const isLowStock = (item: InventoryItem) => {
    return item.quantity <= item.minQuantity;
  };

  const lowStockCount = items?.filter(isLowStock).length || 0;

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(parseFloat(value));
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "character": return "Personagem Completo";
      case "part": return "Peça";
      case "material": return "Material";
      case "accessory": return "Acessório";
      case "consumable": return "Consumível";
      default: return type;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Estoque</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Controle de produtos e personagens
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd} data-testid="button-add-item" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        )}
      </div>

      {lowStockCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 md:gap-4 p-3 md:p-6">
            <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-destructive flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive text-sm md:text-base">Atenção: Estoque Baixo</h3>
              <p className="text-xs md:text-sm text-destructive/80">
                {lowStockCount} {lowStockCount === 1 ? "item está" : "itens estão"} com estoque abaixo do mínimo
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="character" className="flex items-center gap-2 py-2">
            <Package className="h-4 w-4" />
            <span className="hidden md:inline">Personagens</span>
            <span className="md:hidden">Person.</span>
          </TabsTrigger>
          <TabsTrigger value="part" className="flex items-center gap-2 py-2">
            <Scissors className="h-4 w-4" />
            <span>Figurino</span>
          </TabsTrigger>
          <TabsTrigger value="material" className="flex items-center gap-2 py-2">
            <Ruler className="h-4 w-4" />
            <span>Material</span>
          </TabsTrigger>
          <TabsTrigger value="accessory" className="flex items-center gap-2 py-2">
            <Box className="h-4 w-4" />
            <span>Acessórios</span>
          </TabsTrigger>
          <TabsTrigger value="consumable" className="flex items-center gap-2 py-2">
            <Search className="h-4 w-4" />
            <span>Consumíveis</span>
          </TabsTrigger>
        </TabsList>

        <Card className="border-card-border mt-4">
          <CardHeader className="border-b border-border p-3 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-inventory"
                />
              </div>
              <DateFilter value={dateFilter} onChange={setDateFilter} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-3 md:p-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 md:h-16 w-full" />
                ))}
              </div>
            ) : filteredItems && filteredItems.length > 0 ? (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Nome</TableHead>
                        <TableHead className="w-[120px]">Tipo</TableHead>
                        <TableHead className="text-right w-[100px]">Quantidade</TableHead>
                        <TableHead className="text-right w-[120px]">Estoque Mín.</TableHead>
                        {canEdit && <TableHead className="text-right w-[120px]">Valor Custo</TableHead>}
                        {canEdit && <TableHead className="text-right w-[120px]">Valor Venda</TableHead>}
                        <TableHead className="w-[100px]">Status</TableHead>
                        {canEdit && <TableHead className="text-right w-[80px]">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer ${
                            isLowStock(item) ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/50"
                          }`}
                          data-testid={`inventory-item-${item.id}`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-foreground">{item.name}</span>
                              {item.unit && (
                                <span className="text-xs text-muted-foreground">Unidade: {item.unit}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="text-xs capitalize w-fit">
                                {getTypeName(item.type)}
                              </Badge>
                              {item.type === "part" && item.partType && (
                                <Badge variant="secondary" className="text-[10px] w-fit">
                                  {item.partType === "head" ? "Cabeça" : item.partType === "body" ? "Corpo" : "Pés"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono font-semibold ${
                              isLowStock(item) ? "text-destructive" : "text-foreground"
                            }`}>
                              {item.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-muted-foreground">
                              {item.minQuantity}
                            </span>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <span className="font-mono text-sm">
                                {formatCurrency(item.costPrice)}
                              </span>
                            </TableCell>
                          )}
                          {canEdit && (
                            <TableCell className="text-right">
                              <span className="font-mono text-sm">
                                {formatCurrency(item.salePrice)}
                              </span>
                            </TableCell>
                          )}
                          <TableCell>
                            {isLowStock(item) ? (
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <span className="text-xs font-medium text-destructive">Baixo</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Normal</span>
                            )}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-actions-${item.id}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(item)}
                                    data-testid={`button-edit-${item.id}`}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(item.id)}
                                    className="text-destructive focus:text-destructive"
                                    data-testid={`button-delete-${item.id}`}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden divide-y divide-border">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 hover-elevate active-elevate-2 cursor-pointer ${
                        isLowStock(item) ? "bg-destructive/5" : ""
                      }`}
                      onClick={() => canEdit && handleEdit(item)}
                      data-testid={`inventory-item-mobile-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {getTypeName(item.type)}
                            </Badge>
                          </div>
                          {item.unit && (
                            <p className="text-xs text-muted-foreground mt-0.5">Unidade: {item.unit}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className={`font-mono font-semibold text-sm ${
                              isLowStock(item) ? "text-destructive" : "text-foreground"
                            }`}>
                              {item.quantity}
                            </span>
                            <span className="text-xs text-muted-foreground"> / {item.minQuantity}</span>
                          </div>
                          {isLowStock(item) && (
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Custo: {formatCurrency(item.costPrice)}</span>
                          <span>Venda: {formatCurrency(item.salePrice)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 md:p-12 text-center">
                <p className="text-xs md:text-sm text-muted-foreground">
                  {search ? "Nenhum item encontrado" : "Nenhum item cadastrado nesta categoria"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <InventoryDialog
        open={isDialogOpen}
        onClose={handleClose}
        item={selectedItem}
      />
    </div>
  );
}
