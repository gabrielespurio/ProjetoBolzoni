
import "dotenv/config";
import { storage } from "../server/storage";
import { insertEmployeeSchema } from "../shared/schema";

async function main() {
    console.log("Starting reproduction script...");

    // 1. Create a dummy employee
    const newEmployeeData = {
        name: "Test Employee",
        role: "employee",
        isAvailable: true,
        clocksIn: false,
        workloadHours: 0,
        phone: "1234567890",
        email: "test@example.com",
        cpf: "111.111.111-11",
        rg: "11.111.111-1",
        cep: "12345-678",
        rua: "Test St",
        bairro: "Test Neighborhood",
        cidade: "Test City",
        estado: "TS",
        numero: "123"
    };

    try {
        const created = await storage.createEmployee(insertEmployeeSchema.parse(newEmployeeData));
        console.log("Created employee:", created.id);

        // 2. Update the employee
        const updatePayload = {
            clocksIn: true,
            workloadHours: 66, // Distinct value
        };

        console.log("Updating with:", updatePayload);

        // Simulate what the route handler does
        const parsedUpdate = insertEmployeeSchema.partial().parse(updatePayload);
        const updated = await storage.updateEmployee(created.id, parsedUpdate);

        console.log("Updated employee fields:");
        console.log("clocksIn:", updated.clocksIn);
        console.log("workloadHours:", updated.workloadHours);

        if (updated.clocksIn === true && updated.workloadHours === 66) {
            console.log("SUCCESS: Fields updated correctly.");
        } else {
            console.error("FAILURE: Fields did not update correctly.");
        }

        // Cleanup
        await storage.deleteEmployee(created.id);
        console.log("Cleanup done.");

    } catch (error) {
        console.error("Error:", error);
    }
    process.exit(0);
}

main();
