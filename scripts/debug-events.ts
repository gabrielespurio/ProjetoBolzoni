import { db } from "../server/db";
import { events } from "../shared/schema";
import { ilike } from "drizzle-orm";

async function main() {
  const result = await db.select().from(events).where(ilike(events.title, '%espurio%'));
  console.log(`Found ${result.length} events matching espurio:`);
  for (const e of result) {
    console.log(`- ID: ${e.id}, Title: ${e.title}, Status: ${e.status}, Date: ${e.date}`);
  }
  process.exit(0);
}

main().catch(console.error);
