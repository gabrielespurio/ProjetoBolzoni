import { db } from "../server/db";
import { timeRecords, users } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function run() {
  try {
    const userId = "333796ec-2661-4629-bc84-9092fc573c8d";
    
    const query = db.select({
      id: timeRecords.id,
      userId: timeRecords.userId,
      userName: users.name,
    }).from(timeRecords)
      .leftJoin(users, eq(timeRecords.userId, users.id))
      .where(eq(timeRecords.userId, userId))
      .orderBy(desc(timeRecords.timestamp))
      .limit(5);

    console.log("SQL:", query.toSQL());
    
    const result = await query;
    console.log("Result length:", result.length);
  } catch (err) {
    console.error("ERROR:", err);
  }
  process.exit(0);
}

run();
