import { storage } from '../server/storage';

async function check() {
  try {
    const userId = "45127599-563b-410a-8a6c-486a422eb78d"; // I need to find the real userId
    const employees = await storage.getAllEmployees();
    const target = employees.find(e => e.name.includes("Secretaria"));
    console.log("Target Employee:", target);
    
    if (target && target.userId) {
      const records = await storage.getTimeRecords(target.userId);
      console.log("Records for target:", records.records.length, "total:", records.total);
      
      const allRecords = await storage.getAllUsersTimeRecords(undefined, undefined, 50, 0, target.userId);
      console.log("All Users Records for target (paginated):", allRecords.records.length, "total:", allRecords.total);
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
