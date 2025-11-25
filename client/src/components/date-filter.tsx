import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export type DateFilterPreset = "today" | "week" | "month" | "year" | "custom";

export interface DateFilterValue {
  preset: DateFilterPreset;
  range: DateRange | undefined;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [open, setOpen] = useState(false);

  const getPresetLabel = (preset: DateFilterPreset): string => {
    switch (preset) {
      case "today":
        return "Hoje";
      case "week":
        return "Esta Semana";
      case "month":
        return "Este Mês";
      case "year":
        return "Este Ano";
      case "custom":
        return "Personalizado";
      default:
        return "Selecionar período";
    }
  };

  const getDateRangeForPreset = (preset: DateFilterPreset): DateRange | undefined => {
    const now = new Date();
    switch (preset) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfWeek(now, { locale: ptBR }), to: endOfWeek(now, { locale: ptBR }) };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "year":
        return { from: startOfYear(now), to: endOfYear(now) };
      default:
        return undefined;
    }
  };

  const handlePresetSelect = (preset: DateFilterPreset) => {
    if (preset === "custom") {
      onChange({ preset: "custom", range: undefined });
    } else {
      const range = getDateRangeForPreset(preset);
      onChange({ preset, range });
      setOpen(false);
    }
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    onChange({ preset: "custom", range });
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange({ preset: "custom", range: undefined });
  };

  const getDisplayText = () => {
    if (!value.range?.from) {
      return "Filtrar por período";
    }

    if (value.preset !== "custom") {
      return getPresetLabel(value.preset);
    }

    if (value.range.from && value.range.to) {
      return `${format(value.range.from, "dd/MM/yyyy")} - ${format(value.range.to, "dd/MM/yyyy")}`;
    }

    return format(value.range.from, "dd/MM/yyyy");
  };

  const hasActiveFilter = value.range?.from !== undefined;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !hasActiveFilter && "text-muted-foreground"
            )}
            data-testid="button-date-filter"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r border-border">
              <div className="p-3 space-y-1">
                <Button
                  variant={value.preset === "today" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect("today")}
                  data-testid="button-preset-today"
                >
                  Hoje
                </Button>
                <Button
                  variant={value.preset === "week" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect("week")}
                  data-testid="button-preset-week"
                >
                  Esta Semana
                </Button>
                <Button
                  variant={value.preset === "month" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect("month")}
                  data-testid="button-preset-month"
                >
                  Este Mês
                </Button>
                <Button
                  variant={value.preset === "year" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect("year")}
                  data-testid="button-preset-year"
                >
                  Este Ano
                </Button>
                <Button
                  variant={value.preset === "custom" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handlePresetSelect("custom")}
                  data-testid="button-preset-custom"
                >
                  Personalizado
                </Button>
              </div>
            </div>
            {value.preset === "custom" && (
              <div className="p-3">
                <Calendar
                  mode="range"
                  selected={value.range}
                  onSelect={handleCustomRangeSelect}
                  locale={ptBR}
                  numberOfMonths={2}
                  data-testid="calendar-custom-range"
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-9 w-9"
          data-testid="button-clear-filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
