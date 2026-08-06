import { db } from "../server/db";
import { financialTransactions, events, eventInstallments, stockMovements } from "../shared/schema";
import { isNull, notInArray, isNotNull, not } from "drizzle-orm";
import { inArray } from "drizzle-orm";

async function main() {
  console.log("Iniciando limpeza de orfãos...");
  
  // Pegar todos os IDs de eventos existentes
  const allEvents = await db.select({ id: events.id }).from(events);
  const eventIds = allEvents.map(e => e.id);
  
  if (eventIds.length === 0) {
    // Se não tiver nenhum evento, apagar todas as transações que tenham eventId
    console.log("Nenhum evento encontrado, limpando todas as referências.");
    await db.delete(financialTransactions).where(isNotNull(financialTransactions.eventId));
    await db.delete(eventInstallments).where(isNotNull(eventInstallments.eventId));
    await db.delete(stockMovements).where(isNotNull(stockMovements.eventId));
  } else {
    // Apagar transações financeiras órfãs
    const deletedTransactions = await db.delete(financialTransactions)
      .where(not(inArray(financialTransactions.eventId, eventIds)))
      .returning({ id: financialTransactions.id });
    console.log(`Transações financeiras apagadas: ${deletedTransactions.length}`);

    // Apagar parcelas órfãs
    const deletedInstallments = await db.delete(eventInstallments)
      .where(not(inArray(eventInstallments.eventId, eventIds)))
      .returning({ id: eventInstallments.id });
    console.log(`Parcelas apagadas: ${deletedInstallments.length}`);

    // Apagar movimentos de estoque órfãos
    const deletedMovements = await db.delete(stockMovements)
      .where(not(inArray(stockMovements.eventId, eventIds)))
      .returning({ id: stockMovements.id });
    console.log(`Movimentos de estoque apagados: ${deletedMovements.length}`);
  }

  console.log("Limpeza concluída!");
  process.exit(0);
}

main().catch(err => {
  console.error("Erro na limpeza:", err);
  process.exit(1);
});
