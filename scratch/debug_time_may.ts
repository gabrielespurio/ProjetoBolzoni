import { db } from "../server/db";
import { timeRecords, users, employees } from "../shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";

async function checkData() {
    const userId = "1dada4e9-adc5-4bdf-8349-dc59839a411c";
    const now = new Date("2026-05-05T12:00:00");
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    console.log(`Checking records for User ${userId} on ${todayStart.toDateString()}`);
    
    const records = await db.select().from(timeRecords)
        .where(and(
            eq(timeRecords.userId, userId),
            gte(timeRecords.timestamp, todayStart),
            lte(timeRecords.timestamp, todayEnd)
        ));
    
    console.log(`Found ${records.length} records for today.`);
    records.forEach(r => console.log(`- ${r.type} at ${r.timestamp}`));

    // Check all records for this user in May
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthRecords = await db.select().from(timeRecords)
        .where(and(
            eq(timeRecords.userId, userId),
            gte(timeRecords.timestamp, monthStart)
        ));
    console.log(`Found ${monthRecords.length} records for May.`);
}

checkData().catch(console.error);
