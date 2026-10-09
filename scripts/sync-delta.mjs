/**
 * sync-delta.mjs — after the move, copy rows that were saved in the OLD database
 * between the final copy and the switch.
 *
 *   node scripts/sync-delta.mjs          # report only
 *   node scripts/sync-delta.mjs --apply  # insert the missing rows into the new database
 *
 * Only INSERTS rows (matched by id) that exist in OLD but not in NEW. It never overwrites or
 * deletes anything in NEW, and never writes to OLD.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const PG = "C:/Program Files/PostgreSQL/18/bin/";
const apply = process.argv.includes("--apply");

const t = fs.readFileSync(path.resolve(".env.migrate"), "utf8");
const get = (k) => t.match(new RegExp(`^${k}\\s*=\\s*"?([^"\\n]*)"?`, "m"))[1];
const OLD = get("OLD_DB_URL"), NEW = get("NEW_DB_URL");

function psql(url, args, input) {
  const r = spawnSync(PG + "psql.exe", [url, "-X", "-At", "-v", "ON_ERROR_STOP=1", ...args], { encoding: "utf8", input, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error((r.stderr || "psql failed").trim());
  return r.stdout.trim();
}

const tables = psql(OLD, ["-c", "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"]).split(/\r?\n/).filter(Boolean);
let total = 0, checked = 0;
for (const tbl of tables) {
  const hasId = psql(OLD, ["-c", `select count(*) from information_schema.columns where table_schema='public' and table_name='${tbl}' and column_name='id'`]) === "1";
  if (!hasId) continue;
  checked++;
  const oldIds = psql(OLD, ["-c", `select id from "${tbl}"`]).split(/\r?\n/).filter(Boolean);
  const newIds = new Set(psql(NEW, ["-c", `select id from "${tbl}"`]).split(/\r?\n/).filter(Boolean));
  const missing = oldIds.filter((i) => !newIds.has(i));
  if (missing.length === 0) continue;
  total += missing.length;
  console.log(`${tbl}: ${missing.length} row(s) in OLD but not in NEW`);
  if (!apply) continue;
  const list = missing.map((i) => `'${i.replace(/'/g, "''")}'`).join(",");
  const csv = psql(OLD, ["-c", `copy (select * from "${tbl}" where id in (${list})) to stdout with (format csv)`]);
  const sql = `create temp table _d (like "${tbl}" including defaults);\ncopy _d from stdin with (format csv);\n${csv}\n\\.\ninsert into "${tbl}" select * from _d on conflict (id) do nothing;\n`;
  psql(NEW, [], sql);
  console.log(`  copied ${missing.length} into NEW`);
}
console.log(`Checked ${checked} tables.`);
console.log(total === 0 ? "\nNothing to copy: both databases have the same rows." : apply ? `\nDone: ${total} row(s) copied.` : `\n${total} row(s) would be copied. Run again with --apply.`);
