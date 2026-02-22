import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const migration = fs.readFileSync('drizzle/0016_right_the_liberteens.sql', 'utf8');
const statements = migration.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

let ok = 0, fail = 0;
for (const stmt of statements) {
  try {
    await pool.query(stmt);
    ok++;
  } catch (e) {
    if (e.message.includes('already exists')) {
      ok++;
      console.log('SKIP (exists):', stmt.substring(0, 60));
    } else {
      fail++;
      console.error('FAIL:', stmt.substring(0, 80), '\n  ', e.message);
    }
  }
}
console.log(`\nDone: ${ok} ok, ${fail} failed (total ${statements.length} statements)`);
await pool.end();
