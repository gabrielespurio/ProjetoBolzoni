import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, MapPin, Calendar as CalendarIcon, FileText, ChevronDown, User, Building } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventDialog } from "@/components/event-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Event } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateContract } from "@/lib/contractGenerator";

interface EventWithDetails extends Event {
  clientName?: string;
  clientPersonType?: "fisica" | "juridica";
  clientCnpj?: string;
  clientCpf?: string;
  clientRg?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientRua?: string;
  clientNumero?: string;
  clientBairro?: string;
  clientCidade?: string;
  clientEstado?: string;
  clientResponsibleName?: string;
  clientCargo?: string;
  employeeNames?: string[];
  characterNames?: string[];
  packageName?: string;
}

export default function Events() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; status: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });
  const { toast } = useToast();

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isAdmin = userRole === "admin";
  const canEdit = isAdmin;
  const canViewFinancials = isAdmin;
  const canGenerateContract = isAdmin;

  const { data: events, isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/events/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Status atualizado",
        description: "O status do evento foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao atualizar o status do evento.",
        variant: "destructive",
      });
    },
  });

  const filteredEvents = useMemo(() => {
    let result = events || [];
    
    result = filterByDateRange(result, "date", dateFilter);
    
    result = result.filter((event) =>
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      event.cidade?.toLowerCase().includes(search.toLowerCase()) ||
      event.bairro?.toLowerCase().includes(search.toLowerCase()) ||
      event.rua?.toLowerCase().includes(search.toLowerCase())
    );
    
    return result;
  }, [events, search, dateFilter]);

  const handleEdit = (event: EventWithDetails) => {
    // For non-admins, we still open the dialog but it will be read-only
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    if (!canEdit) return;
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500 text-white",
      completed: "bg-green-500 text-white",
      cancelled: "bg-red-500 text-white",
      deleted: "bg-gray-500 text-white",
    };
    return colors[status] || "bg-gray-500 text-white";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
      deleted: "Excluído",
    };
    return labels[status] || status;
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === "deleted") {
      setPendingDelete({ id, status: newStatus });
      setDeleteConfirmOpen(true);
    } else {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      updateStatusMutation.mutate({ id: pendingDelete.id, status: pendingDelete.status });
    }
    setDeleteConfirmOpen(false);
    setPendingDelete(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setPendingDelete(null);
  };

  const renderStatusSelect = (event: EventWithDetails) => {
    return (
      <Select
        value={event.status}
        onValueChange={(newStatus) => handleStatusChange(event.id, newStatus)}
      >
        <SelectTrigger
          className={`w-[140px] ${getStatusColor(event.status)} border-0 font-semibold`}
          onClick={(e) => e.stopPropagation()}
          data-testid={`select-status-${event.id}`}
        >
          <SelectValue>{getStatusLabel(event.status)}</SelectValue>
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          <SelectItem value="scheduled" data-testid="status-scheduled">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Agendado
            </div>
          </SelectItem>
          <SelectItem value="completed" data-testid="status-completed">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Concluído
            </div>
          </SelectItem>
          <SelectItem value="cancelled" data-testid="status-cancelled">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Cancelado
            </div>
          </SelectItem>
          <SelectItem value="deleted" data-testid="status-deleted">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              Excluído
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value));
  };

  const handleGenerateContract = async (event: EventWithDetails, contractType: "fisica" | "juridica") => {
    try {
      const location = [
        event.venueName,
        event.rua,
        event.bairro,
        event.cidade,
        event.estado
      ].filter(Boolean).join(", ") || "Local não informado";

      const eventDate = new Date(event.date);
      const eventTime = format(eventDate, "HH:mm");

      generateContract({
        eventTitle: event.title,
        clientName: event.clientName || "Cliente não informado",
        clientPersonType: event.clientPersonType,
        clientCnpj: event.clientCnpj,
        clientCpf: event.clientCpf,
        clientRg: event.clientRg,
        clientPhone: event.clientPhone,
        clientEmail: event.clientEmail,
        clientRua: event.clientRua,
        clientNumero: event.clientNumero,
        clientBairro: event.clientBairro,
        clientCidade: event.clientCidade,
        clientEstado: event.clientEstado,
        clientResponsibleName: event.clientResponsibleName,
        clientCargo: event.clientCargo,
        eventDate: eventDate,
        eventTime: eventTime,
        location: location,
        contractValue: formatCurrency(event.contractValue),
        package: event.packageName || "Pacote não especificado",
        packageNotes: event.packageNotes || undefined,
        characters: event.characterNames && event.characterNames.length > 0 
          ? event.characterNames 
          : ["Personagem não especificado"],
        employees: event.employeeNames,
        estimatedChildren: 15,
      }, contractType);

      toast({
        title: "Contrato gerado",
        description: `O contrato de ${contractType === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"} foi gerado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao gerar contrato:", error);
      toast({
        title: "Erro ao gerar contrato",
        description: "Ocorreu um erro ao gerar o contrato. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gerencie os eventos da Bolzoni Produções" : "Visualize os eventos"}
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd} data-testid="button-add-event">
            <Plus className="mr-2 h-4 w-4" />
            Novo Evento
          </Button>
        )}
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center gap-4">
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
            <DateFilter value={dateFilter} onChange={setDateFilter} />
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
                        {canViewFinancials && event.contractValue && (
                          <div className="text-right">
                            <p className="text-base font-bold font-mono text-foreground">
                              {formatCurrency(event.contractValue)}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          {canEdit ? (
                            renderStatusSelect(event)
                          ) : (
                            <Badge className={getStatusColor(event.status)}>
                              {getStatusLabel(event.status)}
                            </Badge>
                          )}
                          {canGenerateContract && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  data-testid={`button-generate-contract-${event.id}`}
                                >
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span className="whitespace-nowrap">Contrato</span>
                                  <ChevronDown className="h-3 w-3 shrink-0" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem 
                                  onClick={() => handleGenerateContract(event, "fisica")}
                                  data-testid={`menu-contract-fisica-${event.id}`}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  Pessoa Física
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleGenerateContract(event, "juridica")}
                                  data-testid={`menu-contract-juridica-${event.id}`}
                                >
                                  <Building className="mr-2 h-4 w-4" />
                                  Pessoa Jurídica
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
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

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="alert-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar este evento como excluído? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
