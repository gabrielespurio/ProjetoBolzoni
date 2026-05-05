import { db } from "../server/db";
import { timeRecords, users, employees } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkData() {
    console.log("--- Users ---");
    const allUsers = await db.select().from(users);
    allUsers.forEach(u => console.log(`User: ${u.name}, ID: ${u.id}`));

    console.log("\n--- Employees ---");
    const allEmployees = await db.select().from(employees);
    allEmployees.forEach(e => console.log(`Employee: ${e.name}, UserID: ${e.userId}, Workload: ${e.workloadHours}`));

    console.log("\n--- Time Records (latest 10) ---");
    const records = await db.select().from(timeRecords).limit(10);
    records.forEach(r => console.log(`Record: ${r.type}, UserID: ${r.userId}, Timestamp: ${r.timestamp}`));
}

checkData().catch(console.error);
