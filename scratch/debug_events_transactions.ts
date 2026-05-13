import "dotenv/config";
import { db } from "../server/db";
import { financialTransactions, events } from "../shared/schema";
import { inArray } from "drizzle-orm";

async function main() {
  const trans = await db.select().from(financialTransactions);
  const evts = await db.select().from(events);
  
  const eventsById = Object.fromEntries(evts.map(e => [e.id, e]));

  console.log("Receivables and their events:");
  for (const t of trans) {
    if (t.type === 'receivable') {
      const e = t.eventId ? eventsById[t.eventId] : null;
      console.log({
        txId: t.id,
        amount: t.amount,
        dueDate: t.dueDate,
        paidDate: t.paidDate,
        isPaid: t.isPaid,
        eventDate: e ? e.date : null,
        eventName: e ? e.title : null
      });
    }
  }
  process.exit(0);
}

main().catch(console.error);
