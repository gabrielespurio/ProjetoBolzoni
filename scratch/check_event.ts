import { db } from "../server/db";
import { events } from "../shared/schema";
import { eq } from "drizzle-orm";

async function check() {
  try {
    const id = "cdfbe9ad-7e9e-4a28-9b64-de39a3becde0";
    const [event] = await db.select().from(events).where(eq(events.id, id));
    console.log(JSON.stringify(event, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
