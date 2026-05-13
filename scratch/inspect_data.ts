import { db } from "../server/db";
import { timeRecords, users, employees } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const allRecords = await db.select().from(timeRecords).limit(50);
    console.log("Total records found:", allRecords.length);
    
    if (allRecords.length > 0) {
      const firstRecord = allRecords[0];
      console.log("First record userId:", firstRecord.userId);
      
      const user = await db.select().from(users).where(eq(users.id, firstRecord.userId)).limit(1);
      console.log("Associated User:", user[0]?.name || "Not Found");
      
      const emp = await db.select().from(employees).where(eq(employees.userId, firstRecord.userId)).limit(1);
      console.log("Associated Employee:", emp[0]?.name || "Not Found");
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
  process.exit(0);
}

run();
