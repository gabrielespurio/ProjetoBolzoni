import { storage } from "./server/storage";

async function verify() {
    try {
        console.log("Searching for user 'secretaria'...");
        const user = await storage.getUserByUsername("secretaria");
        if (user) {
            console.log("User found:");
            console.log(`ID: ${user.id}`);
            console.log(`Username: ${user.username}`);
            console.log(`Role: ${user.role}`);
            console.log(`Name: ${user.name}`);

            const normalizedRole = (user.role || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            console.log(`Normalized Role: ${normalizedRole}`);
        } else {
            console.log("User 'secretaria' not found.");
            const users = await storage.getAllUsers();
            console.log("All users in DB:", users.map(u => ({ username: u.username, role: u.role })));
        }
    } catch (error) {
        console.error("Error verifying DB:", error);
    } finally {
        process.exit(0);
    }
}

verify();
