const http = require("http");
let COOKIE = "";
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://127.0.0.1:3000");
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { "Content-Type": "application/json", ...(COOKIE ? { Cookie: COOKIE } : {}), ...(data ? { "Content-Length": Buffer.byteLength(data, "utf8") } : {}) } };
    const req = http.request(opts, (res) => {
      if (res.headers["set-cookie"]) COOKIE = res.headers["set-cookie"][0].split(";")[0];
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { resolve(null); } });
    });
    req.on("error", reject);
    if (data) req.write(data, "utf8");
    req.end();
  });
}

async function main() {
  // Login
  await request("POST", "/api/auth/login", { username: "admin", password: "Gerry123" });
  console.log("Logged in");

  // Use scenario-init.router's initScenario which runs raw SQL via db.execute
  // Instead, call a procedure that creates tables on demand
  // The automation router queries automation_triggered_meetings - we need to create it
  // Let's use the health endpoint to trigger db access, then create table via pg directly

  // Actually, let's just call the automation endpoints - if the table doesn't exist,
  // we need to create it differently. Let's use a simple fetch to pg directly.

  // Use the pg module directly
  const { Client } = require("pg");
  const dotenv = require("dotenv");
  const path = require("path");
  dotenv.config({ path: path.resolve(__dirname, "../.env.development") });
  dotenv.config({ path: path.resolve(__dirname, "../.env") });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log("Connected to DB");

  // Create enum types
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automationtriggertypeenum') THEN
        CREATE TYPE "automationTriggerTypeEnum" AS ENUM ('PHASE_CHANGE', 'T_NODE_DELAY', 'OKR_AT_RISK', 'QUALITY_ESCALATION', 'SUPPLIER_PENALTY');
      END IF;
    END $$;
  `);
  console.log("Enum automationTriggerTypeEnum ensured");

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automationmeetingstatusenum') THEN
        CREATE TYPE "automationMeetingStatusEnum" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'ENDED', 'CANCELLED');
      END IF;
    END $$;
  `);
  console.log("Enum automationMeetingStatusEnum ensured");

  // Create table
  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_triggered_meetings (
      id serial PRIMARY KEY,
      title varchar(300) NOT NULL,
      type "automationTriggerTypeEnum" NOT NULL,
      status "automationMeetingStatusEnum" NOT NULL DEFAULT 'UPCOMING',
      description text,
      scheduled_start timestamp NOT NULL,
      trigger_source varchar(300),
      created_by integer,
      created_at timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log("Table automation_triggered_meetings created");

  // Create indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_auto_meetings_type ON automation_triggered_meetings (type);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_auto_meetings_status ON automation_triggered_meetings (status);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_auto_meetings_scheduled ON automation_triggered_meetings (scheduled_start);`);
  console.log("Indexes created");

  await client.end();
  console.log("Done - automation_triggered_meetings table ready");
}

main().catch(e => { console.error(e); process.exit(1); });
