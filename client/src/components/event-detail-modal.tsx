import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  Package,
  DollarSign,
  CreditCard,
  Users,
  FileText,
  User,
  Pencil,
} from "lucide-react";

interface EventEmployee {
  employeeId: string;
  employeeName: string | null;
  characterId: string | null;
  characterName: string | null;
  cacheValue: string;
}

interface EventData {
  id: string;
  title: string;
  date: string | Date;
  clientName: string;
  packageName: string | null;
  packageNotes: string | null;
  contractValue: string;
  ticketValue: string | null;
  paymentMethod: string | null;
  cardType: string | null;
  paymentDate: string | Date | null;
  installments: number | null;
  status: string;
  notes: string | null;
  createdAt: string | Date;
  cep: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  rua: string | null;
  venueName: string | null;
  venueNumber: string | null;
  characterNames: string[];
  eventEmployees: EventEmployee[];
}

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: EventData) => void;
}

export function EventDetailModal({ event, open, onOpenChange, onEdit }: EventDetailModalProps) {
  if (!event) return null;

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isAdmin = userRole === "admin";
  const canViewFinancials = isAdmin;

  const eventDate = typeof event.date === 'string' ? parseISO(event.date) : event.date;
  const createdAtDate = typeof event.createdAt === 'string' ? parseISO(event.createdAt) : event.createdAt;
  const paymentDateObj = event.paymentDate 
    ? (typeof event.paymentDate === 'string' ? parseISO(event.paymentDate) : event.paymentDate)
    : null;

  const contractValue = parseFloat(event.contractValue) || 0;
  const ticketValue = event.ticketValue ? parseFloat(event.ticketValue) : 0;
  const remainingValue = contractValue - ticketValue;
  const installments = event.installments && event.installments > 0 ? event.installments : 1;
  const installmentValue = installments > 0 ? remainingValue / installments : remainingValue;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const methods: Record<string, string> = {
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartao de Credito',
      'cartao_debito': 'Cartao de Debito',
    };
    return method ? methods[method] || method : '-';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      scheduled: { label: "Agendado", variant: "default" },
      confirmed: { label: "Confirmado", variant: "default" },
      completed: { label: "Concluído", variant: "secondary" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      paid_entry: { label: "Entrada Paga", variant: "default", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatAddress = () => {
    const parts = [
      event.rua,
      event.venueNumber ? `N ${event.venueNumber}` : null,
      event.bairro,
      event.cidade,
      event.estado,
    ].filter(Boolean);
    return parts.join(', ') || '-';
  };

  const renderPaymentInfo = () => {
    const hasEntry = ticketValue > 0;
    const hasInstallments = event.installments && event.installments > 1;
    
    if (hasEntry && hasInstallments) {
      return (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entrada:</span>
            <span className="font-medium">{formatCurrency(ticketValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor Parcelado:</span>
            <span className="font-medium">{formatCurrency(remainingValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parcelas:</span>
            <span className="font-medium">{installments}x de {formatCurrency(installmentValue)}</span>
          </div>
          {paymentDateObj && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Pagamento:</span>
              <span className="font-medium">{format(paymentDateObj, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      );
    } else if (hasEntry) {
      return (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entrada:</span>
            <span className="font-medium">{formatCurrency(ticketValue)}</span>
          </div>
          {remainingValue > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Restante:</span>
              <span className="font-medium">{formatCurrency(remainingValue)}</span>
            </div>
          )}
          {paymentDateObj && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Pagamento:</span>
              <span className="font-medium">{format(paymentDateObj, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      );
    } else if (hasInstallments) {
      return (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-medium">{formatCurrency(contractValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parcelas:</span>
            <span className="font-medium">{installments}x de {formatCurrency(installmentValue)}</span>
          </div>
          {paymentDateObj && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Pagamento:</span>
              <span className="font-medium">{format(paymentDateObj, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pagamento a vista:</span>
            <span className="font-medium">{formatCurrency(contractValue)}</span>
          </div>
          {paymentDateObj && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Pagamento:</span>
              <span className="font-medium">{format(paymentDateObj, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-xl" data-testid="modal-event-title">{event.title}</DialogTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(event.status)}
                {isAdmin && onEdit && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEdit(event)}
                    data-testid="button-edit-event"
                    className="h-8 px-2"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data do Evento</p>
                  <p className="font-medium" data-testid="text-event-date">
                    {format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Horario</p>
                  <p className="font-medium" data-testid="text-event-time">
                    {format(eventDate, "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium" data-testid="text-client-name">{event.clientName}</p>
              </div>
            </div>

            {event.packageName && (
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Pacote</p>
                  <p className="font-medium" data-testid="text-package-name">{event.packageName}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Local</p>
                <p className="font-medium" data-testid="text-event-location">
                  {event.venueName ? `${event.venueName} - ` : ''}{formatAddress()}
                </p>
              </div>
            </div>

            {canViewFinancials && (
              <>
                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Valores e Pagamento</h3>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Total do Contrato:</span>
                      <span className="font-bold text-lg" data-testid="text-contract-value">{formatCurrency(contractValue)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Forma de Pagamento:</span>
                      <span className="font-medium">{getPaymentMethodLabel(event.paymentMethod)}</span>
                      {event.cardType && <span className="text-sm">({event.cardType})</span>}
                    </div>
                    <Separator />
                    {renderPaymentInfo()}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Elenco</h3>
              </div>
              {event.eventEmployees && event.eventEmployees.length > 0 ? (
                <div className="space-y-2">
                  {event.eventEmployees.map((emp, index) => (
                    <div 
                      key={`${emp.employeeId}-${index}`} 
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                      data-testid={`elenco-item-${index}`}
                    >
                      <div>
                        <p className="font-medium">{emp.characterName || 'Personagem nao definido'}</p>
                        <p className="text-sm text-muted-foreground">
                          Funcionario: {emp.employeeName || 'Nao atribuido'}
                        </p>
                      </div>
                      {canViewFinancials && (
                        <Badge variant="outline">{formatCurrency(parseFloat(emp.cacheValue) || 0)}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : event.characterNames && event.characterNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {event.characterNames.map((name, index) => (
                    <Badge key={index} variant="secondary">{name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum personagem atribuido</p>
              )}
            </div>

            {(event.packageNotes || event.notes) && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Observacoes</h3>
                  </div>
                  <div className="space-y-3">
                    {event.packageNotes && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Observacao do Pacote:</p>
                        <p className="text-sm" data-testid="text-package-notes">{event.packageNotes}</p>
                      </div>
                    )}
                    {event.notes && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Observacao do Evento:</p>
                        <p className="text-sm" data-testid="text-event-notes">{event.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>Contrato gerado em: {format(createdAtDate, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
