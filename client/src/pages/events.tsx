import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { EventDialog } from "@/components/event-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Event } from "@shared/schema";

interface EventWithDetails extends Event {
  clientName?: string;
  employeeNames?: string[];
  characterNames?: string[];
}

export default function Events() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);

  const { data: events, isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events"],
  });

  const filteredEvents = events?.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    event.cidade?.toLowerCase().includes(search.toLowerCase()) ||
    event.bairro?.toLowerCase().includes(search.toLowerCase()) ||
    event.rua?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (event: EventWithDetails) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      scheduled: "default",
      completed: "secondary",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
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
          <h1 className="text-2xl font-semibold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os eventos da Bolzoni Produções
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-event">
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, cliente ou local..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-events"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleEdit(event)}
                  data-testid={`event-${event.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-base font-semibold text-foreground">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">{event.clientName}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-base font-bold font-mono text-foreground">
                            {formatCurrency(event.contractValue)}
                          </p>
                        </div>
                        {getStatusBadge(event.status)}
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{format(new Date(event.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[event.rua, event.bairro, event.cidade, event.estado]
                            .filter(Boolean)
                            .join(", ") || "Endereço não informado"}
                        </span>
                      </div>
                    </div>
                    {event.characterNames && event.characterNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.characterNames.map((name, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum evento encontrado" : "Nenhum evento cadastrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <EventDialog
        open={isDialogOpen}
        onClose={handleClose}
        event={selectedEvent}
      />
    </div>
  );
}
