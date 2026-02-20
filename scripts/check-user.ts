import "dotenv/config";
import { db } from "../server/db";
import { users, employees } from "../shared/schema";
import { like, or, eq } from "drizzle-orm";

async function main() {
    console.log("Searching for 'secretaria' in users table...");
    const foundUsers = await db.select().from(users).where(like(users.email, "%secretaria%"));
    console.log(JSON.stringify(foundUsers, null, 2));

    console.log("\nSearching for 'secretaria' in employees table...");
    const foundEmployees = await db.select().from(employees).where(
        or(
            like(employees.email, "%secretaria%"),
            like(employees.name, "%secretaria%")
        )
    );
    console.log(JSON.stringify(foundEmployees, null, 2));
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
