import { isWithinInterval, parseISO } from "date-fns";
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
      itemDate = new Date(dateValue);
    }

    // Valida se a data é válida
    if (!isFinite(itemDate.getTime())) {
      return false;
    }

    if (!to) {
      return isWithinInterval(itemDate, {
        start: from,
        end: from,
      });
    }

    return isWithinInterval(itemDate, {
      start: from,
      end: to,
    });
  });
}
