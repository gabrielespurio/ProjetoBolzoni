import { storage } from "../server/storage";

async function main() {
  try {
    const quoteId = "cf912972-27e8-44ee-90aa-5c33d2d538e1"; // from earlier
    console.log("Updating quote...");
    await storage.updateQuote(quoteId, { status: "approved" });
    console.log("Updated!");
    
    process.exit(0);
  } catch (err) {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  }
}

main();
