import { createClient } from "@supabase/supabase-js";

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const forbidden = ["SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY", "STUDIO_SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"];
const missing = required.filter((key) => !process.env[key]);
const leaked = forbidden.filter((key) => Boolean(process.env[key]));

function result(name, status, detail = "") {
  console.log(`${status === "pass" ? "PASS" : status === "skip" ? "SKIP" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

if (leaked.length) {
  for (const key of leaked) result("service-role safety", "fail", `${key} is present in the verification environment`);
  process.exit(1);
}
result("service-role safety", "pass", "no forbidden server credentials present");

if (missing.length) {
  for (const key of missing) result("environment", "fail", `${key} is missing`);
  process.exit(1);
}
result("environment", "pass", "publishable Supabase configuration present");

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const session = await client.auth.getSession();
if (session.error) {
  result("auth session lookup", "fail", "session lookup failed");
  process.exit(1);
}
result("auth session lookup", "pass", "anonymous client can initialize");

const email = process.env.SUPABASE_GAME_TEST_EMAIL;
const password = process.env.SUPABASE_GAME_TEST_PASSWORD;
if (!email || !password) {
  result("authenticated checks", "skip", "set SUPABASE_GAME_TEST_EMAIL and SUPABASE_GAME_TEST_PASSWORD to run RLS round-trip checks");
  process.exit(0);
}

const signIn = await client.auth.signInWithPassword({ email, password });
if (signIn.error || !signIn.data.user) {
  result("email sign-in", "fail", "test account sign-in failed");
  process.exit(1);
}
result("email sign-in", "pass", "test account authenticated");

const user = signIn.data.user;
const now = new Date().toISOString();
const deviceId = `verify-${Date.now().toString(36)}`;
const playerState = {
  playerId: "verify-player",
  saveVersion: 9,
  contentVersion: 10,
  revision: 1,
  createdAt: now,
  updatedAt: now,
  lastSimulationAt: now,
  civilization: { civilizationName: "Verification", currentEraId: "survival", eraProgress: 0, eraMastery: 0, population: 5, discoveryPoints: 0 },
  economy: { balances: { "ECON-LABOR": 0, "ECON-CREDITS": 0, "ECON-POPULATION": 5, "ECON-RESEARCH": 0, "ECON-PREMIUM-CRYSTALS": 0 }, rates: {} },
  resources: { inventory: {}, productionRates: {}, storageLimits: {} },
  production: { clickPower: 1, autoClickPower: 0, autoClickRate: 1, lastClickGain: 0, lastClickWasCritical: false, criticalChance: 0, criticalMultiplier: 2, comboMultiplier: 1, automationEnabled: true, totalManualClicks: 0, totalAutoClicks: 0, lifetimeLaborGenerated: 0, totalAutoLaborGenerated: 0 },
  upgrades: { levels: {}, unlockedIds: [], discoveredIds: [] },
  alignment: { industry: 0, technology: 0, cyber: 0, nature: 0, corporate: 0 },
  objectives: { objectiveProgress: {} },
  events: {},
  boosts: { active: [] },
  colonies: { colonyCount: 1, nextColonyProgress: 0 },
  unresolved: { economy: {}, economyRates: {}, resources: {}, resourceRates: {}, storageLimits: {}, upgradeLevels: {}, unlockedUpgradeIds: [], discoveredUpgradeIds: [], boostDefinitionIds: [], migrationNotes: [] },
  runtimeLoadReport: { loadedFrom: "New Game", saveSource: "canonical-runtime", saveLoaded: false, newGamePathExecuted: true, migrationExecuted: false, loadedAt: now, contentVersion: 10, currentSaveVersion: 9 }
};

const profile = await client.from("player_profiles").upsert({ user_id: user.id, updated_at: now }, { onConflict: "user_id" }).select().single();
if (profile.error) throw new Error(`player_profiles upsert failed: ${profile.error.message}`);
result("player_profiles upsert", "pass");

const device = await client.from("player_devices").upsert({ user_id: user.id, device_id: deviceId, device_name: "Verification Browser", platform: "node", app_version: "verify", last_seen: now, created_at: now, updated_at: now }, { onConflict: "user_id,device_id" }).select().single();
if (device.error) throw new Error(`player_devices upsert failed: ${device.error.message}`);
result("player_devices upsert", "pass");

const save = await client.from("player_saves").upsert({
  user_id: user.id,
  slot_id: "primary",
  save_version: 9,
  content_version: 10,
  player_state: playerState,
  unresolved_state: playerState.unresolved,
  revision: 1,
  device_id: deviceId,
  device_name: "Verification Browser",
  last_simulation_at: now
}, { onConflict: "user_id,slot_id" }).select().single();
if (save.error) throw new Error(`player_saves upsert failed: ${save.error.message}`);
result("player_saves insert/update", "pass");

const updated = await client.from("player_saves").update({ revision: 2, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("slot_id", "primary").eq("revision", 1).select().maybeSingle();
if (updated.error || !updated.data) throw new Error(`player_saves revision update failed: ${updated.error?.message ?? "no row updated"}`);
result("revision update", "pass");

const conflict = await client.from("player_saves").update({ revision: 3 }).eq("user_id", user.id).eq("slot_id", "primary").eq("revision", 1).select().maybeSingle();
if (conflict.error || conflict.data) throw new Error("stale revision conflict was not detected");
result("revision conflict detection", "pass");

const backup = await client.from("player_save_backups").insert({ user_id: user.id, slot_id: "primary", backup_reason: "verification", player_state: playerState, revision: 2, device_id: deviceId, device_name: "Verification Browser" }).select().single();
if (backup.error) throw new Error(`player_save_backups insert failed: ${backup.error.message}`);
result("player_save_backups insert", "pass");

const backupList = await client.from("player_save_backups").select("id").eq("user_id", user.id).eq("slot_id", "primary").limit(1);
if (backupList.error) throw new Error(`player_save_backups select failed: ${backupList.error.message}`);
result("player_save_backups select", "pass");

const signOut = await client.auth.signOut();
if (signOut.error) throw new Error(`sign out failed: ${signOut.error.message}`);
result("sign-out", "pass");
