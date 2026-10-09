/**
 * migrate-db.mjs — copy the production database from one Neon project to another
 * (used to move from Oregon to Singapore).
 *
 *   node scripts/migrate-db.mjs            # copy into an EMPTY new database, then verify
 *   node scripts/migrate-db.mjs --wipe     # same, but first erase whatever is in the new database
 *
 * Reads OLD_DB_URL and NEW_DB_URL (direct, non-pooled Neon connection strings) from
 * .env.migrate in the project root. That file is ignored by git. The old database is only
 * ever READ. A full backup file is written to Documents\YosBackups before anything is restored.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const PG = "C:/Program Files/PostgreSQL/18/bin/";
const wipe = process.argv.includes("--wipe");

function readUrls() {
  const f = path.resolve(".env.migrate");
  if (!fs.existsSync(f)) throw new Error("Missing .env.migrate in the project folder.");
  const get = (k) => {
    const m = fs.readFileSync(f, "utf8").match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m"));
    return (m ? m[1] : "").trim().replace(/^['"]|['"]$/g, "");
  };
  return { oldUrl: get("OLD_DB_URL"), newUrl: get("NEW_DB_URL") };
}

function hostOf(u) {
  try { return new URL(u).hostname; } catch { throw new Error("A connection string in .env.migrate is not a valid URL."); }
}

function run(bin, args, { capture = false } = {}) {
  const r = spawnSync(PG + bin, args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "pipe"] });
  if (r.error) throw r.error;
  return { code: r.status, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}

const psql = (url, sql) => run("psql.exe", [url, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { capture: true });

function tableCounts(url) {
  const gen = psql(url,
    "SELECT string_agg(format('SELECT %L AS t, count(*) AS n FROM public.%I', table_name, table_name), ' UNION ALL ' ORDER BY table_name) " +
    "FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  if (gen.code !== 0) throw new Error("Could not list tables: " + gen.err);
  if (!gen.out) return {};
  const res = psql(url, gen.out);
  if (res.code !== 0) throw new Error("Could not count rows: " + res.err);
  return Object.fromEntries(res.out.split("\n").filter(Boolean).map((l) => { const [t, n] = l.split("|"); return [t, Number(n)]; }));
}

const { oldUrl, newUrl } = readUrls();
if (!oldUrl || !newUrl) throw new Error("Both OLD_DB_URL and NEW_DB_URL must be set in .env.migrate.");
const oh = hostOf(oldUrl), nh = hostOf(newUrl);
if (oh === nh && !(process.argv.includes("--test-local") && oh === "localhost" && oldUrl !== newUrl)) throw new Error("OLD_DB_URL and NEW_DB_URL point to the same database. Stopping.");
if (oh.includes("-pooler") || nh.includes("-pooler")) throw new Error("Use the DIRECT (non-pooled) connection strings: the host must not contain '-pooler'.");
const localTest = process.argv.includes("--test-local") && oh === "localhost" && nh === "localhost";
if (!localTest && !nh.includes("ap-southeast-1")) throw new Error("NEW_DB_URL is not a Singapore (ap-southeast-1) database. Stopping.");
console.log(`Old: ${oh.replace(/^[^.]+/, "*")}\nNew: ${nh.replace(/^[^.]+/, "*")}`);

const oldVer = psql(oldUrl, "SHOW server_version").out, newVer = psql(newUrl, "SHOW server_version").out;
console.log(`Postgres versions: old ${oldVer}, new ${newVer}`);
if (oldVer.split(".")[0] !== newVer.split(".")[0]) console.log("WARNING: major versions differ; restore may report harmless errors. The row-count check below is what matters.");

const before = tableCounts(newUrl);
if (Object.keys(before).length > 0) {
  if (!wipe) throw new Error(`The new database already has ${Object.keys(before).length} tables. Re-run with --wipe to erase it first.`);
  console.log("Erasing the new database (--wipe)...");
  const w = psql(newUrl, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  if (w.code !== 0) throw new Error("Could not wipe: " + w.err);
}

const dir = "C:/Users/kaush/Documents/YosBackups";
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = `${dir}/yos-prod-${stamp}.dump`;
console.log("Backing up the old database (read-only)...");
const d = run("pg_dump.exe", ["-Fc", "--no-owner", "--no-acl", "-d", oldUrl, "-f", file]);
if (d.code !== 0) throw new Error("pg_dump failed: " + d.err);
console.log(`Backup saved: ${file} (${(fs.statSync(file).size / 1048576).toFixed(1)} MB)`);

console.log("Restoring into the new database...");
const r = run("pg_restore.exe", ["--no-owner", "--no-acl", "-d", newUrl, file]);
if (r.err) console.log("pg_restore messages:\n" + r.err.split("\n").slice(0, 15).join("\n"));

console.log("Verifying row counts...");
const a = tableCounts(oldUrl), b = tableCounts(newUrl);
let bad = 0, total = 0;
for (const t of Object.keys(a).sort()) {
  total += a[t];
  const ok = a[t] === b[t];
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "BAD"} ${t.padEnd(28)} old=${String(a[t]).padStart(7)} new=${String(b[t] ?? "missing").padStart(7)}`);
}
for (const t of Object.keys(b)) if (!(t in a)) { bad++; console.log(`BAD ${t} exists only in the new database`); }
console.log(bad === 0 ? `\nALL ${Object.keys(a).length} TABLES MATCH (${total} rows).` : `\n${bad} PROBLEM(S) FOUND. Do not switch the site over.`);
process.exit(bad === 0 ? 0 : 1);
