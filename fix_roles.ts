import { storage } from "./server/storage";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq, or } from "drizzle-orm";

async function fix() {
    try {
        console.log("Updating roles for 'secretaria' users...");

        const usernames = [
            "secretariabolzoniproducoes@outloock.com",
            "secretaria@teste.com"
        ];

        for (const username of usernames) {
            const user = await storage.getUserByUsername(username);
            if (user) {
                console.log(`Found user: ${username}, Current Role: ${user.role}`);
                await db.update(users).set({ role: "secretaria" }).where(eq(users.id, user.id));
                console.log(`Updated user ${username} to role 'secretaria'`);
            } else {
                console.log(`User ${username} not found`);
            }
        }

        console.log("Done.");
    } catch (error) {
        console.error("Error fixing roles:", error);
    } finally {
        process.exit(0);
    }
}

fix();
