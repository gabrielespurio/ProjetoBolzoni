import { isWithinInterval, parseISO, startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateFilterValue } from "@/components/date-filter";

/**
 * Filtra um array de itens com base em um campo de data e um filtro de data
 * @param items - Array de itens a serem filtrados
 * @param dateField - Nome do campo de data no item (pode ser nested, ex: "event.date")
 * @param filter - Valor do filtro de data
 * @returns Array filtrado
 */
export function filterByDateRange<T extends Record<string, any>>(
  items: T[],
  dateField: string,
  filter: DateFilterValue
): T[] {
  if (!filter.range?.from) {
    return items;
  }

  const { from, to } = filter.range;

  return items.filter((item) => {
    // Suporta campos nested usando dot notation
    const dateValue = dateField.split('.').reduce((obj, key) => obj?.[key], item);
    
    // Exclui registros sem data quando há filtro ativo
    if (!dateValue) {
      return false;
    }

    // Converte para Date, tratando strings ISO e objetos Date
    let itemDate: Date;
    if (typeof dateValue === 'string') {
      itemDate = parseISO(dateValue);
    } else if (dateValue instanceof Date) {
      itemDate = dateValue;
    } else {
      itemDate = new Date(dateValue as any);
    }

    // Valida se a data é válida
    if (!isFinite(itemDate.getTime())) {
      return false;
    }

    // Usa startOfDay para 'from' e endOfDay para 'to' para incluir o dia inteiro
    const startDate = startOfDay(from);
    const endDate = to ? endOfDay(to) : endOfDay(from);

    return isWithinInterval(itemDate, {
      start: startDate,
      end: endDate,
    });
  });
}

/**
 * Formata uma data de forma segura sem sofrer com desvios de fuso horário.
 * Suporta objetos Date, strings no formato YYYY-MM-DD e strings ISO completas.
 */
export function formatLocalDate(dateValue: any, formatStr: string = "dd/MM/yyyy"): string {
  if (!dateValue) return "";

  let dateStr = "";
  if (dateValue instanceof Date) {
    dateStr = dateValue.toISOString();
  } else if (typeof dateValue === "string") {
    dateStr = dateValue;
  } else {
    dateStr = String(dateValue);
  }

  // Se for uma string no formato YYYY-MM-DD (com ou sem horário depois)
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    if (formatStr === "dd/MM/yyyy") {
      return `${day}/${month}/${year}`;
    }
    return format(new Date(`${year}-${month}-${day}T12:00:00`), formatStr, { locale: ptBR });
  }

  // Fallback para outros formatos
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return format(date, formatStr, { locale: ptBR });
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }

  return "";
}

