import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Phone, Mail, MapPin } from "lucide-react";
import { ClientDialog } from "@/components/client-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import type { Client } from "@shared/schema";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isAdmin = user?.role === "admin" || user?.role === "secretaria";
  const canEdit = isAdmin;

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const filteredClients = useMemo(() => {
    let result = clients || [];

    result = filterByDateRange(result, "createdAt", dateFilter);

    result = result.filter((client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.cidade?.toLowerCase().includes(search.toLowerCase()) ||
      client.phone?.includes(search) ||
      client.email?.toLowerCase().includes(search.toLowerCase())
    );

    return result;
  }, [clients, search, dateFilter]);

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    if (!canEdit) return;
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedClient(null);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {canEdit ? "Gerencie os clientes da Bolzoni Produções" : "Visualize os clientes da Bolzoni Produções"}
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd} data-testid="button-add-client" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        )}
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border p-3 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-clients"
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
          ) : filteredClients && filteredClients.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-3 md:p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleView(client)}
                  data-testid={`client-${client.id}`}
                >
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm md:text-base font-semibold text-foreground">{client.name}</h3>
                    </div>
                    <div className="grid gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.cidade && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{client.cidade}</span>
                        </div>
                      )}
                    </div>
                    {client.notes && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{client.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 md:p-12 text-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDialog
        open={isDialogOpen}
        onClose={handleClose}
        client={selectedClient}
      />
    </div>
  );
}
