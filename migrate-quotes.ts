import 'dotenv/config';
import { pool } from './server/db';

async function migrate() {
  try {
    console.log("Iniciando migração da tabela quotes...");
    await pool.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS characters;`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total_costs numeric(10,2) NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS profit_margin numeric(5,2) NOT NULL DEFAULT 0;`);
    console.log("Migração concluída com sucesso.");
  } catch (error) {
    console.error("Erro na migração:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
