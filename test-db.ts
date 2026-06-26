import 'dotenv/config';
import { storage } from './server/storage';

async function run() {
  try {
    const duplicateId = "a8107c55-4053-4d37-a7db-3b14180d937d";
    console.log(`Deleting duplicate event: ${duplicateId}`);
    await storage.deleteEvent(duplicateId);
    console.log('Successfully deleted the duplicate event.');
  } catch(e) {
    console.error('ERROR:', e);
  }
  process.exit(0);
}
run();
