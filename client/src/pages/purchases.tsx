import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Purchase } from "@shared/schema";

export default function Purchases() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });

  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const filteredPurchases = useMemo(() => {
    let result = purchases || [];
    
    result = filterByDateRange(result, "purchaseDate", dateFilter);
    
    result = result.filter((purchase) =>
      purchase.supplier.toLowerCase().includes(search.toLowerCase()) ||
      purchase.description.toLowerCase().includes(search.toLowerCase())
    );
    
    return result;
  }, [purchases, search, dateFilter]);

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedPurchase(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedPurchase(null);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Registre compras e abasteça o estoque
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-purchase">
          <Plus className="mr-2 h-4 w-4" />
          Nova Compra
        </Button>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por fornecedor ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-purchases"
              />
            </div>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredPurchases && filteredPurchases.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleEdit(purchase)}
                  data-testid={`purchase-${purchase.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{purchase.description}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Fornecedor: {purchase.supplier}</span>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {(() => {
                              const date = new Date(purchase.purchaseDate);
                              const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
                              return format(localDate, "dd/MM/yyyy", { locale: ptBR });
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold font-mono text-foreground">
                        {formatCurrency(purchase.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhuma compra encontrada" : "Nenhuma compra cadastrada"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseDialog
        open={isDialogOpen}
        onClose={handleClose}
        purchase={selectedPurchase}
      />
    </div>
  );
}
