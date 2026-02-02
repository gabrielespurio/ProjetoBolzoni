import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Phone, Mail, MapPin, Utensils } from "lucide-react";
import { BuffetDialog } from "@/components/buffet-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import type { Buffet } from "@shared/schema";

export default function Buffets() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBuffet, setSelectedBuffet] = useState<Buffet | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isAdmin = userRole === "admin";
  const canEdit = isAdmin;

  const { data: buffets, isLoading } = useQuery<Buffet[]>({
    queryKey: ["/api/buffets"],
  });

  const filteredBuffets = useMemo(() => {
    let result = buffets || [];
    
    result = filterByDateRange(result, "createdAt", dateFilter);
    
    result = result.filter((buffet) =>
      buffet.name.toLowerCase().includes(search.toLowerCase()) ||
      buffet.address?.toLowerCase().includes(search.toLowerCase()) ||
      buffet.responsibleName?.toLowerCase().includes(search.toLowerCase()) ||
      buffet.phone?.includes(search) ||
      buffet.email?.toLowerCase().includes(search.toLowerCase())
    );
    
    return result;
  }, [buffets, search, dateFilter]);

  const handleView = (buffet: Buffet) => {
    setSelectedBuffet(buffet);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    if (!canEdit) return;
    setSelectedBuffet(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedBuffet(null);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Buffets</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {canEdit ? "Gerencie os buffets parceiros da empresa" : "Visualize os buffets parceiros da empresa"}
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd} data-testid="button-add-buffet" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Buffet
          </Button>
        )}
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border p-3 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar buffet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-buffets"
              />
            </div>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 md:space-y-4 p-3 md:p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 md:h-24 w-full" />
              ))}
            </div>
          ) : filteredBuffets && filteredBuffets.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredBuffets.map((buffet) => (
                <div
                  key={buffet.id}
                  className="p-3 md:p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleView(buffet)}
                  data-testid={`buffet-${buffet.id}`}
                >
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-primary" />
                        <h3 className="text-sm md:text-base font-semibold text-foreground">{buffet.name}</h3>
                      </div>
                      {buffet.responsibleName && (
                        <span className="text-xs text-muted-foreground">Resp: {buffet.responsibleName}</span>
                      )}
                    </div>
                    <div className="grid gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      {buffet.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{buffet.phone}</span>
                        </div>
                      )}
                      {buffet.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{buffet.email}</span>
                        </div>
                      )}
                      {buffet.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{buffet.address}</span>
                        </div>
                      )}
                    </div>
                    {buffet.notes && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{buffet.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 md:p-12 text-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                {search ? "Nenhum buffet encontrado" : "Nenhum buffet cadastrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <BuffetDialog
        open={isDialogOpen}
        onClose={handleClose}
        buffet={selectedBuffet}
      />
    </div>
  );
}
