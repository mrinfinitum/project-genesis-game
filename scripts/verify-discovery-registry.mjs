import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "supabase/migrations/202607150001_universal_discovery_registry.sql");
const sql = readFileSync(migrationPath, "utf8");
const required = [
  "universal_objects",
  "universal_discoveries",
  "universal_discovery_milestones",
  "universal_names",
  "universal_discovery_history",
  "universal_discovery_reports",
  "public_explorer_profiles",
  "civilization_discovery_credits",
  "claim_universal_discovery",
  "enable row level security",
  "unique (universe_id, universal_object_id",
  "unique (request_id)"
];

const failures = required.filter((fragment) => !sql.toLowerCase().includes(fragment.toLowerCase())).map((fragment) => `Migration is missing: ${fragment}`);
const liveConfigured = Boolean(process.env.SUPABASE_GAME_TEST_EMAIL && process.env.SUPABASE_GAME_TEST_PASSWORD && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

const report = {
  ok: failures.length === 0,
  mode: liveConfigured ? "schema-and-live-env-ready" : "schema-only",
  migrationPath,
  tables: required.slice(0, 8),
  liveVerificationSkipped: !liveConfigured,
  skipReason: liveConfigured ? undefined : "SUPABASE_GAME_TEST_EMAIL/PASSWORD and VITE_SUPABASE_URL/ANON_KEY are not all configured.",
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
