/**
 * import-lockers.mjs
 * Run: node scripts/import-lockers.mjs
 *
 * Imports locker allocations + history from "Locker Details 2.xlsx".
 * Each row = one locker (1-60) with up to 3 [holderName, allocatedDate] pairs
 * read left-to-right as chronological history. The last pair with a name is
 * the current holder; a trailing date with no name means the locker was
 * vacated on that date and is currently empty.
 *
 * Holder names are fuzzy-matched against Member and Employee full names;
 * unmatched names (vendors, doctors, ambiguous "A/B" pairs) are stored as
 * free text on holderName.
 *
 * Safe to re-run: wipes and rebuilds all Locker + LockerHistory rows.
 */

import { createRequire } from "module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const prisma = new PrismaClient();

const FILE = "C:/Users/kaush/OneDrive/YOS Original/Locker Details 2.xlsx";

function excelDateToJS(serial) {
  if (!serial || typeof serial !== "number") return null;
  const utc = (serial - 25569) * 86400 * 1000;
  const d = new Date(utc);
  if (isNaN(d.getTime()) || d.getFullYear() < 1990 || d.getFullYear() > 2050) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalize(name) {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

async function main() {
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets["Sheet1"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const dataRows = rows.slice(1); // skip header

  // Build lookup maps for fuzzy matching
  const members = await prisma.member.findMany({ select: { id: true, fullName: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, fullName: true } });
  const memberMap = new Map(members.map(m => [normalize(m.fullName), m.id]));
  const employeeMap = new Map(employees.map(e => [normalize(e.fullName), e.id]));

  function matchHolder(rawName) {
    const name = rawName.trim();
    if (!name) return { holderName: null, memberId: null, employeeId: null };
    const norm = normalize(name);
    // Only match single-name entries — "A/B" combos and lists stay free-text
    if (!norm.includes("/") && !norm.includes(",")) {
      if (memberMap.has(norm)) return { holderName: name, memberId: memberMap.get(norm), employeeId: null };
      if (employeeMap.has(norm)) return { holderName: name, memberId: null, employeeId: employeeMap.get(norm) };
    }
    return { holderName: name, memberId: null, employeeId: null };
  }

  console.log(`Wiping existing locker data...`);
  await prisma.lockerHistory.deleteMany({});
  await prisma.locker.deleteMany({});

  let created = 0, matchedMembers = 0, matchedEmployees = 0, currentOccupied = 0;

  for (const row of dataRows) {
    const number = Number(row[0]);
    if (!number || isNaN(number)) continue;

    // pairs: [1,2], [3,4], [5,6]
    const pairs = [
      [row[1], row[2]],
      [row[3], row[4]],
      [row[5], row[6]],
    ].filter(([name, date]) => String(name).trim() !== "" || date !== "");

    const locker = await prisma.locker.create({
      data: { number, status: "VACANT" },
    });
    created++;

    if (pairs.length === 0) continue;

    const entries = pairs.map(([rawName, rawDate]) => ({
      name: String(rawName || "").trim(),
      date: excelDateToJS(rawDate),
    }));

    // Walk entries as a timeline: a named entry opens a new segment (closing
    // any open one at that date); an unnamed dated entry closes the open
    // segment (locker sat vacant afterward) with no new segment opened.
    let openSegment = null; // { name, allocatedDate }

    for (const entry of entries) {
      if (entry.name) {
        if (openSegment) {
          const match = matchHolder(openSegment.name);
          if (match.memberId) matchedMembers++;
          if (match.employeeId) matchedEmployees++;
          await prisma.lockerHistory.create({
            data: {
              lockerId: locker.id,
              holderName: match.holderName,
              memberId: match.memberId,
              employeeId: match.employeeId,
              allocatedDate: openSegment.allocatedDate,
              vacatedDate: entry.date,
            },
          });
        }
        openSegment = { name: entry.name, allocatedDate: entry.date };
      } else if (entry.date) {
        if (openSegment) {
          const match = matchHolder(openSegment.name);
          if (match.memberId) matchedMembers++;
          if (match.employeeId) matchedEmployees++;
          await prisma.lockerHistory.create({
            data: {
              lockerId: locker.id,
              holderName: match.holderName,
              memberId: match.memberId,
              employeeId: match.employeeId,
              allocatedDate: openSegment.allocatedDate,
              vacatedDate: entry.date,
            },
          });
        }
        openSegment = null;
      }
    }

    if (openSegment) {
      const match = matchHolder(openSegment.name);
      if (match.memberId) matchedMembers++;
      if (match.employeeId) matchedEmployees++;
      await prisma.lockerHistory.create({
        data: {
          lockerId: locker.id,
          holderName: match.holderName,
          memberId: match.memberId,
          employeeId: match.employeeId,
          allocatedDate: openSegment.allocatedDate,
          vacatedDate: null,
        },
      });
      await prisma.locker.update({
        where: { id: locker.id },
        data: {
          status: "OCCUPIED",
          holderName: match.holderName,
          memberId: match.memberId,
          employeeId: match.employeeId,
          allocatedDate: openSegment.allocatedDate,
        },
      });
      currentOccupied++;
    }
  }

  console.log(`\nDone.`);
  console.log(`Lockers created: ${created}`);
  console.log(`Currently occupied: ${currentOccupied}`);
  console.log(`Currently vacant: ${created - currentOccupied}`);
  console.log(`Matched to members: ${matchedMembers}`);
  console.log(`Matched to employees: ${matchedEmployees}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
