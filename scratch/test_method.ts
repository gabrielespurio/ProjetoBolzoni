import { storage } from "../server/storage";

async function run() {
  try {
    const userId = "1dada4e9-adc5-4bdf-8349-dc59839a411c";
    const result = await storage.getAllUsersTimeRecords(undefined, undefined, 50, 0, userId);
    console.log("getAllUsersTimeRecords result length:", result.records.length);
    console.log("Total:", result.total);
    if (result.records.length > 0) {
      console.log("First record:", result.records[0]);
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
  process.exit(0);
}

run();
