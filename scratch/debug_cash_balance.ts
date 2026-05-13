import "dotenv/config";
import { db } from "../server/db";
import { financialTransactions } from "../shared/schema";

async function main() {
  const trans = await db.select().from(financialTransactions);
  
  let balance = 0;
  let totalReceivable = 0;
  let totalPayable = 0;

  console.log("Paid transactions:");
  for (const t of trans) {
    if (t.isPaid) {
      const amount = parseFloat(t.amount);
      if (t.type === 'receivable') {
        balance += amount;
        totalReceivable += amount;
        console.log(`+ ${amount.toFixed(2)} (Receivable, ID: ${t.id})`);
      } else {
        balance -= amount;
        totalPayable += amount;
        console.log(`- ${amount.toFixed(2)} (Payable, ID: ${t.id})`);
      }
    }
  }
  
  console.log("---");
  console.log("Total Receivables Paid:", totalReceivable);
  console.log("Total Payables Paid:", totalPayable);
  console.log("Final Cash Balance:", balance);
  process.exit(0);
}

main().catch(console.error);
