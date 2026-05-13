const { Pool } = require('pg');

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "postgres://default:o2l8KzSkmWcY@ep-sweet-glitter-a496f862-pooler.us-east-1.aws.neon.tech:5432/verceldb?sslmode=require";

const pool = new Pool({ connectionString: databaseUrl });

async function test() {
  try {
    const res = await pool.query('SELECT * FROM time_records LIMIT 5');
    console.log("Got records:", res.rows.length);
    console.log(res.rows);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

test();
