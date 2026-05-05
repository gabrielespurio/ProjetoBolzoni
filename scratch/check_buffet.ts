import { db } from "../server/db";
import { buffets } from "../shared/schema";
import { eq } from "drizzle-orm";

async function check() {
  try {
    const id = "cac2a28d-9ce3-4cd3-bd99-e9081a303f3a";
    const [buffet] = await db.select().from(buffets).where(eq(buffets.id, id));
    console.log(JSON.stringify(buffet, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
