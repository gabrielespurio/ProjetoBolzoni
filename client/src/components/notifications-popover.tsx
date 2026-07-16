import { useQuery } from "@tanstack/react-query";
import { Bell, AlertCircle, CalendarClock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation } from "wouter";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PaymentNotification {
  eventId: string;
  title: string;
  date: string;
  contractValue: number;
  totalPaid: number;
  remaining: number;
  daysUntil: number;
}

export function NotificationsPopover() {
  const [, setLocation] = useLocation();
  const { data: notifications = [], isLoading } = useQuery<PaymentNotification[]>({
    queryKey: ["/api/notifications/pending-payments"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const hasNotifications = notifications.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Bell className="h-4 w-4" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
              {notifications.length > 99 ? "99+" : notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Notificações
            {hasNotifications && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                {notifications.length}
              </Badge>
            )}
          </h4>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando notificações...
            </div>
          ) : !hasNotifications ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Nenhuma pendência crítica no momento</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div key={notif.eventId} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-900/30">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Pendência Financeira
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notif.title}
                      </p>
                      
                      <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-muted/50 p-2 text-xs">
                        <div className="font-medium text-red-600">
                          Restante: {formatCurrency(notif.remaining)}
                        </div>
                        <div className="text-right flex items-center justify-end gap-1 font-medium">
                          <CalendarClock className="h-3 w-3" />
                          {notif.daysUntil < 0 
                            ? "Atrasado" 
                            : notif.daysUntil === 0 
                              ? "É hoje!" 
                              : `Em ${notif.daysUntil} dia(s)`}
                        </div>
                      </div>
                      
                      <div className="pt-2 text-xs text-muted-foreground flex items-center justify-between">
                        <span>Data do evento: {format(new Date(notif.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <button 
                          onClick={() => {
                            setLocation(`/events?id=${notif.eventId}`);
                            window.dispatchEvent(new CustomEvent('open-event-modal', { detail: { id: notif.eventId } }));
                          }}
                          className="text-primary hover:underline font-medium flex items-center cursor-pointer bg-transparent border-none p-0"
                        >
                          Ver <ChevronRight className="h-3 w-3 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
