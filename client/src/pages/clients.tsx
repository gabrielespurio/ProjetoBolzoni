import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Phone, Mail, MapPin } from "lucide-react";
import { ClientDialog } from "@/components/client-dialog";
import type { Client } from "@shared/schema";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const filteredClients = clients?.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.city?.toLowerCase().includes(search.toLowerCase()) ||
    client.phone?.includes(search) ||
    client.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os clientes da Bolzoni Produções
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-client">
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-clients"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredClients && filteredClients.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleEdit(client)}
                  data-testid={`client-${client.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-foreground">{client.name}</h3>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{client.city}</span>
                        </div>
                      )}
                    </div>
                    {client.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{client.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
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
