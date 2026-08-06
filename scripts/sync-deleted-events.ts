import { db } from "../server/db";
import { events } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";

async function main() {
  console.log("Sincronizando eventos deletados...");
  
  const deletedEvents = await db.select().from(events).where(eq(events.status, 'deleted'));
  
  console.log(`Encontrados ${deletedEvents.length} eventos deletados.`);
  
  for (const event of deletedEvents) {
    await storage.syncEventFinancialTransactions(event.id);
    console.log(`Limpo financeiro do evento ${event.id}`);
  }

  console.log("Limpeza concluída!");
  process.exit(0);
}

main().catch(err => {
  console.error("Erro na limpeza:", err);
  process.exit(1);
});
