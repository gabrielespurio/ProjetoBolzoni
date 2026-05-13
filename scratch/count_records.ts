import { storage } from "../server/storage";
import { db } from "../server/db";
import { users, clients, events, financialTransactions, inventoryItems } from "../shared/schema";
import { count } from "drizzle-orm";

async function countRecords() {
    try {
        console.log("--- Record Counts ---");
        const userCount = await db.select({ value: count() }).from(users);
        const clientCount = await db.select({ value: count() }).from(clients);
        const eventCount = await db.select({ value: count() }).from(events);
        const transCount = await db.select({ value: count() }).from(financialTransactions);
        const inventoryCount = await db.select({ value: count() }).from(inventoryItems);

        console.log(`Users: ${userCount[0].value}`);
        console.log(`Clients: ${clientCount[0].value}`);
        console.log(`Events: ${eventCount[0].value}`);
        console.log(`Transactions: ${transCount[0].value}`);
        console.log(`Inventory Items: ${inventoryCount[0].value}`);
    } catch (error) {
        console.error("Error counting records:", error);
    } finally {
        process.exit(0);
    }
}

countRecords();
