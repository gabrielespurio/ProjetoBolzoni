import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { EventDetailModal } from "@/components/event-detail-modal";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addWeeks,
  addYears,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "year">("month");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "employee";
  const isAdmin = userRole === "admin";

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const eventsWithDates = useMemo(() => {
    return events.map(event => ({
      ...event,
      dateObj: parseISO(event.date as any),
    }));
  }, [events]);

  const getEventsForDate = (date: Date) => {
    return eventsWithDates.filter(event =>
      isSameDay(event.dateObj, date)
    );
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (view === "month") {
      setCurrentDate(prev => addMonths(prev, direction === "next" ? 1 : -1));
    } else if (view === "week") {
      setCurrentDate(prev => addWeeks(prev, direction === "next" ? 1 : -1));
    } else {
      setCurrentDate(prev => addYears(prev, direction === "next" ? 1 : -1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight" data-testid="text-agenda-title">Agenda</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Visualize seus eventos organizados por semana, mês ou ano
          </p>
        </div>
        <Button onClick={goToToday} variant="outline" data-testid="button-today" className="w-full sm:w-auto">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Hoje
        </Button>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center justify-center sm:justify-start gap-2 md:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("prev")}
                data-testid="button-prev-period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[120px] sm:min-w-[180px] md:min-w-[200px] text-center">
                <CardTitle className="text-sm md:text-base lg:text-lg" data-testid="text-current-period">
                  {view === "month" && format(currentDate, "MMM yyyy", { locale: ptBR })}
                  {view === "week" && `${format(startOfWeek(currentDate, { locale: ptBR }), "dd/MM", { locale: ptBR })} - ${format(endOfWeek(currentDate, { locale: ptBR }), "dd/MM", { locale: ptBR })}`}
                  {view === "year" && format(currentDate, "yyyy")}
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("next")}
                data-testid="button-next-period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs md:text-sm text-center sm:text-left">
            {eventsWithDates.length} eventos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto" data-testid="tabs-view-selector">
              <TabsTrigger value="month" data-testid="tab-month" className="text-xs sm:text-sm py-2">Mês</TabsTrigger>
              <TabsTrigger value="week" data-testid="tab-week" className="text-xs sm:text-sm py-2">Semana</TabsTrigger>
              <TabsTrigger value="year" data-testid="tab-year" className="text-xs sm:text-sm py-2">Ano</TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="mt-6">
              <MonthView currentDate={currentDate} getEventsForDate={getEventsForDate} onEventClick={handleEventClick} />
            </TabsContent>

            <TabsContent value="week" className="mt-6">
              <WeekView currentDate={currentDate} getEventsForDate={getEventsForDate} onEventClick={handleEventClick} />
            </TabsContent>

            <TabsContent value="year" className="mt-6">
              <YearView currentDate={currentDate} eventsWithDates={eventsWithDates} onEventClick={handleEventClick} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EventDetailModal
        event={selectedEvent}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

function MonthView({ currentDate, getEventsForDate, onEventClick }: any) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  const weekDaysFull = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="space-y-1 md:space-y-2">
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1 md:mb-2">
        {weekDays.map((day, idx) => (
          <div key={day} className="text-center text-[10px] md:text-sm font-medium text-muted-foreground p-1 md:p-2">
            <span className="md:hidden">{day}</span>
            <span className="hidden md:inline">{weekDaysFull[idx]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className={`min-h-[60px] md:min-h-[100px] border rounded-md md:rounded-lg p-1 md:p-2 ${
                !isCurrentMonth ? "bg-muted/50 text-muted-foreground" : "bg-background"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
              data-testid={`day-${format(day, "yyyy-MM-dd")}`}
            >
              <div className={`text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${isToday ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5 md:space-y-1">
                {dayEvents.slice(0, 2).map((event: any) => (
                  <button
                    key={event.id}
                    className="w-full text-left text-[9px] md:text-xs p-0.5 md:p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover-elevate"
                    title={event.title}
                    onClick={() => onEventClick(event)}
                    data-testid={`event-${event.id}`}
                  >
                    <span className="hidden md:inline">{format(event.dateObj, "HH:mm")} </span>{event.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] md:text-xs text-muted-foreground">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, getEventsForDate, onEventClick }: any) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatLocation = (event: any) => {
    const parts = [event.cidade, event.estado].filter(Boolean);
    return parts.join(' - ') || event.venueName || '';
  };

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="text-sm font-medium text-muted-foreground p-2">Hora</div>
            {days.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`text-center p-2 rounded ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <div className="text-sm font-medium">
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div className="text-xs">{format(day, "dd/MM")}</div>
                </div>
              );
            })}
          </div>
          <div className="border rounded-lg overflow-hidden">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-2 border-b last:border-b-0">
                <div className="text-xs text-muted-foreground p-2 border-r">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {days.map(day => {
                  const dayEvents = getEventsForDate(day).filter((event: any) => {
                    const eventHour = event.dateObj.getHours();
                    return eventHour === hour;
                  });

                  return (
                    <div key={day.toISOString()} className="p-1 min-h-[60px] border-r last:border-r-0">
                      {dayEvents.map((event: any) => (
                        <button
                          key={event.id}
                          className="w-full text-left text-xs p-1 rounded bg-primary/10 text-primary mb-1 cursor-pointer hover-elevate"
                          title={`${event.title} - ${formatLocation(event)}`}
                          onClick={() => onEventClick(event)}
                          data-testid={`event-${event.id}`}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-[10px] opacity-75 truncate">{formatLocation(event)}</div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="md:hidden space-y-2">
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`border rounded-lg p-2 ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <div className={`text-sm font-medium mb-2 ${isToday ? "text-primary" : ""}`}>
                {format(day, "EEEE, dd/MM", { locale: ptBR })}
              </div>
              {dayEvents.length > 0 ? (
                <div className="space-y-1">
                  {dayEvents.map((event: any) => (
                    <button
                      key={event.id}
                      className="w-full text-left text-xs p-2 rounded bg-primary/10 text-primary cursor-pointer hover-elevate"
                      onClick={() => onEventClick(event)}
                      data-testid={`event-mobile-${event.id}`}
                    >
                      <div className="font-medium truncate">{format(event.dateObj, "HH:mm")} - {event.title}</div>
                      <div className="text-[10px] opacity-75 truncate">{formatLocation(event)}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Sem eventos</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function YearView({ currentDate, eventsWithDates, onEventClick }: any) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const getEventsForMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return eventsWithDates.filter((event: any) =>
      event.dateObj >= monthStart && event.dateObj <= monthEnd
    );
  };

  const getEventsForDay = (day: Date) => {
    return eventsWithDates.filter((event: any) => isSameDay(event.dateObj, day));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
      {months.map(month => {
        const monthEvents = getEventsForMonth(month);
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const calendarStart = startOfWeek(monthStart, { locale: ptBR });
        const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

        return (
          <Card key={month.toISOString()} className="overflow-hidden">
            <CardHeader className="p-2 md:p-4 pb-1 md:pb-3">
              <CardTitle className="text-xs md:text-base capitalize">
                {format(month, "MMM", { locale: ptBR })}
              </CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                {monthEvents.length} eventos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-3">
              <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, idx) => (
                  <div key={idx} className="text-center text-[8px] md:text-[10px] font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {days.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, month);
                  const dayEvents = getEventsForDay(day);
                  const hasEvents = dayEvents.length > 0;
                  const isToday = isSameDay(day, new Date());

                  if (hasEvents && isCurrentMonth) {
                    return (
                      <button
                        key={idx}
                        className={`text-center text-[9px] md:text-xs p-0.5 md:p-1 rounded cursor-pointer hover-elevate ${
                          isToday ? "bg-primary text-primary-foreground" : "bg-primary/20 font-medium"
                        }`}
                        onClick={() => onEventClick(dayEvents[0])}
                        title={dayEvents.map((e: any) => e.title).join(', ')}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`text-center text-[9px] md:text-xs p-0.5 md:p-1 rounded ${
                        !isCurrentMonth ? "text-muted-foreground/50" : ""
                      } ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
