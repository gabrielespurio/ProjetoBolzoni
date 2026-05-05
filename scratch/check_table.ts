import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    const result = await db.execute(sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_packages')`);
    console.log(result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
