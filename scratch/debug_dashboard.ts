import "dotenv/config";
import { db } from "../server/db";
import { events } from "../shared/schema";
import { gte, lte, and } from "drizzle-orm";

async function main() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const mayEvents = await db.select().from(events).where(
    and(
      gte(events.date, firstDayOfMonth),
      lte(events.date, lastDayOfMonth)
    )
  );

  console.log("Total events in May:", mayEvents.length);
  const totalValue = mayEvents.reduce((acc, e) => acc + parseFloat(e.contractValue || "0"), 0);
  console.log("Total contract value of events in May:", totalValue);
  
  process.exit(0);
}

main().catch(console.error);
