import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, AlertTriangle, Edit } from "lucide-react";
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

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(parseFloat(value));
  };

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
            <div className="space-y-2 p-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nome</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="text-right w-[100px]">Quantidade</TableHead>
                    <TableHead className="text-right w-[120px]">Estoque Mín.</TableHead>
                    <TableHead className="text-right w-[120px]">Valor Custo</TableHead>
                    <TableHead className="text-right w-[120px]">Valor Venda</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="text-right w-[80px]">Ações</TableHead>
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
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.type === "consumable" ? "Consumível" : "Personagem"}
                        </Badge>
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
                      <TableCell className="text-right">
                        {item.type === "character" ? (
                          <span className="font-mono text-sm">
                            {formatCurrency(item.costPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.type === "character" ? (
                          <span className="font-mono text-sm">
                            {formatCurrency(item.salePrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
