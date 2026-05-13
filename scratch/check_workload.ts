import { storage } from "../server/storage";
import { db } from "../server/db";
import { users, employees } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkEmployee() {
    try {
        console.log("--- Employee Workload Check ---");
        // Get all employees to find the one in the screenshot
        const allEmployees = await storage.getAllEmployees();
        console.log("Employees found:", allEmployees.map(e => ({ name: e.name, workload: e.workloadHours })));
        
        // Find 'Secretaria Administradora'
        const sec = allEmployees.find(e => e.name === "Secretaria Administradora");
        if (sec) {
            console.log(`\nFound: ${sec.name}`);
            console.log(`Workload Hours: ${sec.workloadHours}`);
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

checkEmployee();
