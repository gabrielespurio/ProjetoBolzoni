import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { InventoryDialog } from "@/components/inventory-dialog";
import type { InventoryItem } from "@shared/schema";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            Controle de produtos e personagens
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-item">
          <Plus className="mr-2 h-4 w-4" />
          Novo Item
        </Button>
      </div>

      {lowStockCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Atenção: Estoque Baixo</h3>
              <p className="text-sm text-destructive/80">
                {lowStockCount} {lowStockCount === 1 ? "item está" : "itens estão"} com estoque abaixo do mínimo
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-inventory"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`hover-elevate active-elevate-2 cursor-pointer border-card-border ${
                    isLowStock(item) ? "border-destructive/50" : ""
                  }`}
                  onClick={() => handleEdit(item)}
                  data-testid={`inventory-item-${item.id}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-base font-semibold text-foreground line-clamp-1">
                              {item.name}
                            </h3>
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.type === "consumable" ? "Consumível" : "Personagem"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Quantidade:</span>
                          <span className={`font-bold font-mono ${isLowStock(item) ? "text-destructive" : "text-foreground"}`}>
                            {item.quantity} {item.unit || "un"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Estoque Mín:</span>
                          <span className="font-mono text-muted-foreground">
                            {item.minQuantity} {item.unit || "un"}
                          </span>
                        </div>
                      </div>
                      {isLowStock(item) && (
                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-xs font-medium text-destructive">Estoque baixo</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum item encontrado" : "Nenhum item cadastrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryDialog
        open={isDialogOpen}
        onClose={handleClose}
        item={selectedItem}
      />
    </div>
  );
}
