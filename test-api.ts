import 'dotenv/config';
import { storage } from './server/storage';
async function run() {
  const events = await storage.getUpcomingEvents(1);
  const id = events[0].id;
  console.log('Testing PATCH on', id);

  const res = await fetch('http://localhost:5005/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password' })
  });
  const data = await res.json();
  const token = data.token;

  const patchRes = await fetch('http://localhost:5005/api/events/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ status: 'deleted' })
  });
  const text = await patchRes.text();
  console.log(patchRes.status, text);

  // revert
  await fetch('http://localhost:5005/api/events/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ status: 'scheduled' })
  });

  process.exit(0);
}
run().catch(console.error);
