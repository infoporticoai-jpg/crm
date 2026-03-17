/**
 * import-tapis.ts — Comprehensive CSV/JSON import for Solathèque Tapis module
 *
 * Usage:
 *   COMPANY_ID=<solathèque-company-id> npx tsx scripts/import-tapis.ts
 *
 * Reads all CSV/JSON files from data/tapis-sheets/ and imports into:
 *   TapisClient, TapisJob, TapisPricing, TapisInventory,
 *   TapisSupplierOrder, TapisPickup, TapisMaintenance
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const COMPANY_ID = process.env.COMPANY_ID;
const DATA_DIR = path.join(__dirname, "..", "data", "tapis-sheets");

if (!COMPANY_ID) {
  console.error("ERROR: COMPANY_ID env variable is required.");
  process.exit(1);
}

// ─── CSV Parser (handles quoted fields with commas inside) ─────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(filePath: string): string[][] {
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: ${path.basename(filePath)} not found`);
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map(parseCSVLine);
}

function readJSON(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: ${path.basename(filePath)} not found`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ─── Value helpers ─────────────────────────────────────────────────

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

function cleanOrNull(v: string | undefined): string | null {
  const c = clean(v);
  return c === "" ? null : c;
}

function parseBool(v: string | undefined): boolean {
  const c = clean(v).toUpperCase();
  return c === "TRUE" || c === "VRAI";
}

/** Parse numbers like "4 425" or "5379,2" or "640" */
function parseNum(v: string | undefined): number | null {
  const c = clean(v).replace(/\s/g, "").replace(",", ".");
  if (c === "" || c === "-") return null;
  const n = parseFloat(c);
  return isNaN(n) ? null : n;
}

function parseInt2(v: string | undefined): number | null {
  const n = parseNum(v);
  return n === null ? null : Math.round(n);
}

/** French month mapping */
const FR_MONTHS: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3,
  mai: 4, juin: 5, juillet: 6, août: 7, aout: 7,
  septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
  // abbreviated
  "janv.": 0, "janv": 0, "févr.": 1, "févr": 1, "fév.": 1, "fév": 1,
  "mars.": 2, "avr.": 3, "avr": 3,
  "mai.": 4, "juin.": 5, "juil.": 6, "juil": 6,
  "août.": 7, "sept.": 8, "sept": 8,
  "oct.": 9, "oct": 9, "nov.": 10, "nov": 10,
  "déc.": 11, "déc": 11, "dec.": 11, "dec": 11,
};

/**
 * Parse French date strings:
 *   "avr. 13" -> April 13
 *   "3 avril" -> April 3
 *   "28 novembre" -> Nov 28
 *   "oct. 1" -> Oct 1
 *   "20 mars" -> March 20
 *   "03-10-2025" -> Oct 3, 2025
 *   "30-01-2026" -> Jan 30, 2026
 *   "23 octobre 2025" -> Oct 23, 2025
 */
function parseFrenchDate(v: string | undefined, defaultYear: number): Date | null {
  const c = clean(v);
  if (!c) return null;

  // DD-MM-YYYY format
  const ddmmyyyy = c.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1]);
    const m = parseInt(ddmmyyyy[2]) - 1;
    const y = parseInt(ddmmyyyy[3]);
    return new Date(y, m, d);
  }

  // "23 octobre 2025" format
  const fullWithYear = c.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (fullWithYear) {
    const d = parseInt(fullWithYear[1]);
    const mStr = fullWithYear[2].toLowerCase();
    const y = parseInt(fullWithYear[3]);
    const m = FR_MONTHS[mStr];
    if (m !== undefined) return new Date(y, m, d);
  }

  // "avr. 13" / "oct. 1" format (month first, then day)
  const monthFirst = c.match(/^(\S+\.?)\s+(\d{1,2})$/);
  if (monthFirst) {
    const mStr = monthFirst[1].toLowerCase();
    const d = parseInt(monthFirst[2]);
    const m = FR_MONTHS[mStr];
    if (m !== undefined) return new Date(defaultYear, m, d);
  }

  // "3 avril" / "28 novembre" / "12 juillet" format (day first, then month)
  const dayFirst = c.match(/^(\d{1,2})\s+(\S+)$/);
  if (dayFirst) {
    const d = parseInt(dayFirst[1]);
    const mStr = dayFirst[2].toLowerCase();
    const m = FR_MONTHS[mStr];
    if (m !== undefined) return new Date(defaultYear, m, d);
  }

  // "25 oct." format
  const dayAbbr = c.match(/^(\d{1,2})\s+(\S+\.)$/);
  if (dayAbbr) {
    const d = parseInt(dayAbbr[1]);
    const mStr = dayAbbr[2].toLowerCase();
    const m = FR_MONTHS[mStr];
    if (m !== undefined) return new Date(defaultYear, m, d);
  }

  // "19 decembre" (no accent) — already covered by dayFirst but just in case
  return null;
}

/** Determine season from a month: oct-dec = automne, apr-jun = printemps */
function guessSeason(date: Date | null): string | null {
  if (!date) return null;
  const m = date.getMonth();
  if (m >= 3 && m <= 7) return "printemps";
  if (m >= 8 && m <= 11) return "automne";
  if (m >= 0 && m <= 2) return "printemps"; // jan-mar installs typically spring
  return null;
}

// ─── Client map for lookup ─────────────────────────────────────────

const clientMap = new Map<string, string>(); // projectNumber -> clientId

async function ensureClient(projectNumber: string): Promise<string | null> {
  const pn = clean(projectNumber);
  if (!pn) return null;
  if (clientMap.has(pn)) return clientMap.get(pn)!;

  // Try to find in DB
  const existing = await prisma.tapisClient.findUnique({
    where: { companyId_projectNumber: { companyId: COMPANY_ID!, projectNumber: pn } },
  });
  if (existing) {
    clientMap.set(pn, existing.id);
    return existing.id;
  }

  // Create minimal stub
  const created = await prisma.tapisClient.create({
    data: {
      companyId: COMPANY_ID!,
      projectNumber: pn,
      name: pn,
    },
  });
  clientMap.set(pn, created.id);
  return created.id;
}

// ─── 1. Import Clients from _ALL_CLIENTS.json ─────────────────────

async function importClients() {
  const clients: any[] = readJSON(path.join(DATA_DIR, "_ALL_CLIENTS.json"));
  let count = 0;

  for (const c of clients) {
    const projectNumber = clean(c.name);
    if (!projectNumber) continue;

    const name = c.addresses?.[0] ?? projectNumber;
    const address = c.cities?.[0] ?? null;
    const email = c.emails?.[0] ?? null;
    const contact = c.contacts?.join(", ") || null;

    const existing = await prisma.tapisClient.findUnique({
      where: { companyId_projectNumber: { companyId: COMPANY_ID!, projectNumber } },
    });

    if (existing) {
      await prisma.tapisClient.update({
        where: { id: existing.id },
        data: { name, address, email, contact },
      });
      clientMap.set(projectNumber, existing.id);
    } else {
      const created = await prisma.tapisClient.create({
        data: {
          companyId: COMPANY_ID!,
          projectNumber,
          name,
          address,
          email,
          contact,
        },
      });
      clientMap.set(projectNumber, created.id);
    }
    count++;
  }
  console.log(`Imported ${count} clients from _ALL_CLIENTS.json`);
}

// ─── 2. Import Job CSVs ───────────────────────────────────────────

/**
 * Column mapping for retrait/reinstallation CSVs (the big seasonal sheets).
 * These share a similar structure — column indices vary slightly per file
 * so we find them by header text matching.
 */

interface ColMap {
  buildingType: number;
  facDevisAspReinstallation: number;
  reinstallation: number;
  facDevisAspRetrait: number;
  rebut: number;
  retrait: number;
  facDevisAspNettEntreposage: number;
  entreposage: number;
  nettoyerEntrepot: number;
  tapeVert: number;
  moulures: number;
  pc: number;
  carreaux: number;
  projectNumber: number;
  name: number;
  address: number;
  city: number;
  date: number;
  hours: number;
  contactSurPlace: number;
  postalCode: number;
  comments: number[]; // all comment columns
  pickupDone: number;
  pickupRef: number;
  nbrGars: number;
  hIns: number;
  moulure: number;
  moulureAChanger: number;
  emailSent: number;
  confirmation: number;
  confirmationDates: number;
  email: number;
  detailTapis: number;
  factNumber: number;
  nettoyer: number;
  payer: number;
  solaFacture: number;
  ajustement: number;
  datePrevue: number;
  fait: number;
}

function findCol(headers: string[], ...patterns: string[]): number {
  for (const pattern of patterns) {
    const lp = pattern.toLowerCase().trim();
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase().trim().includes(lp)) return i;
    }
  }
  return -1;
}

function buildColMap(headers: string[]): ColMap {
  // Find all comment columns
  const comments: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toLowerCase().includes("commentaires")) comments.push(i);
  }

  return {
    buildingType: 0, // first column is always building type
    facDevisAspReinstallation: findCol(headers, "fac/devis _ asp_réinstallation", "fac/devis _ asp_reinstallation"),
    reinstallation: findCol(headers, "réinstallation", "reinstallation"),
    facDevisAspRetrait: findCol(headers, "fac/devis _ asp_retrait", "devis _ facture .asp"),
    rebut: findCol(headers, "rebut"),
    retrait: findCol(headers, "retrait"),
    facDevisAspNettEntreposage: findCol(headers, "fac/devis _ asp_nett+entreposage"),
    entreposage: findCol(headers, "entreposage"),
    nettoyerEntrepot: findCol(headers, "nettoyer entrepôt", "nettoyer entrepot"),
    tapeVert: findCol(headers, "tape vert"),
    moulures: findCol(headers, "moulures"),
    pc: findCol(headers, " pc "),
    carreaux: findCol(headers, "carreaux"),
    projectNumber: findCol(headers, "# projet"),
    name: findCol(headers, " noms", "noms"),
    address: findCol(headers, " adresse", "adresse"),
    city: findCol(headers, "ville"),
    date: findCol(headers, "date réinstallation", "date"),
    hours: findCol(headers, "heures", "heure"),
    contactSurPlace: findCol(headers, "contact sur place", "contact sur les lieux", "contact"),
    postalCode: findCol(headers, "code postal"),
    comments,
    pickupDone: findCol(headers, "pickup fait"),
    pickupRef: findCol(headers, "pickup/ref"),
    nbrGars: findCol(headers, "nbr gars"),
    hIns: findCol(headers, "h/ins"),
    moulure: findCol(headers, "moulure "),
    moulureAChanger: findCol(headers, "moulure à changer"),
    emailSent: findCol(headers, "courriel envoyé"),
    confirmation: findCol(headers, "confirmation"),
    confirmationDates: findCol(headers, "confirmation des dates"),
    email: findCol(headers, "courriel"),
    detailTapis: findCol(headers, "détail des tapis"),
    factNumber: findCol(headers, "fact #"),
    nettoyer: findCol(headers, "nettoyer"),
    payer: findCol(headers, "payer"),
    solaFacture: findCol(headers, "sola facture"),
    ajustement: findCol(headers, "ajustement"),
    datePrevue: findCol(headers, "date prévue"),
    fait: findCol(headers, "fait"),
  };
}

function getField(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  return row[idx];
}

async function importSeasonalJobCSV(
  filename: string,
  jobType: string,
  year: number,
  season: string | null,
) {
  const filePath = path.join(DATA_DIR, filename);
  const rows = parseCSV(filePath);
  if (rows.length < 2) return;

  // Find header row — the one containing "# Projet"
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    if (joined.includes("# projet") || joined.includes("# project")) {
      headerIdx = i;
      break;
    }
  }
  const headers = rows[headerIdx];
  const cols = buildColMap(headers);
  let count = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const projectNumber = clean(getField(row, cols.projectNumber));
    if (!projectNumber || projectNumber.match(/^\d+$/) && projectNumber.length < 4) continue;
    // skip summary/total rows
    if (projectNumber.toLowerCase().includes("total")) continue;

    const clientId = await ensureClient(projectNumber);
    if (!clientId) continue;

    // Build season history from comment columns
    const seasonHistory: Record<string, string> = {};
    for (const ci of cols.comments) {
      const hdr = clean(headers[ci]).toLowerCase();
      const val = clean(getField(row, ci));
      if (!val) continue;
      // Extract season key from header like "Commentaires - Printemps 2025"
      const m = hdr.match(/commentaires?\s*-?\s*(printemps|automne)\s*(\d{4})/i);
      if (m) {
        seasonHistory[`${m[1].toLowerCase()}_${m[2]}`] = val;
      }
    }

    // Update client with extra data from this row
    const buildingType = cleanOrNull(getField(row, cols.buildingType));
    const city = cleanOrNull(getField(row, cols.city));
    const postalCode = cleanOrNull(getField(row, cols.postalCode));
    const emailVal = cleanOrNull(getField(row, cols.email));
    const addressVal = cleanOrNull(getField(row, cols.address));
    const nameVal = cleanOrNull(getField(row, cols.name));

    // Update client record with richer data
    const clientUpdate: any = {};
    if (buildingType) clientUpdate.buildingType = buildingType;
    if (city) clientUpdate.city = city;
    if (postalCode) clientUpdate.postalCode = postalCode;
    if (emailVal) clientUpdate.email = emailVal;
    if (addressVal) clientUpdate.address = addressVal;
    if (nameVal) clientUpdate.name = nameVal;
    if (Object.keys(seasonHistory).length > 0) {
      // Merge with existing
      const existing = await prisma.tapisClient.findUnique({ where: { id: clientId } });
      let existingHistory: Record<string, string> = {};
      try {
        existingHistory = JSON.parse(existing?.seasonHistory || "{}");
      } catch {}
      clientUpdate.seasonHistory = JSON.stringify({ ...existingHistory, ...seasonHistory });
    }
    if (Object.keys(clientUpdate).length > 0) {
      await prisma.tapisClient.update({ where: { id: clientId }, data: clientUpdate });
    }

    const scheduledDate = parseFrenchDate(getField(row, cols.date), year);
    const currentComment = cols.comments.length > 0 ? cleanOrNull(getField(row, cols.comments[0])) : null;

    await prisma.tapisJob.create({
      data: {
        companyId: COMPANY_ID!,
        clientId,
        jobType,
        season: season ?? guessSeason(scheduledDate),
        year,
        scheduledDate,
        hours: cleanOrNull(getField(row, cols.hours)),
        crewSize: parseInt2(getField(row, cols.nbrGars)),
        installHours: parseNum(getField(row, cols.hIns)),
        moulurePL: parseInt2(getField(row, cols.moulures)),
        moulureToChange: parseBool(getField(row, cols.moulureAChanger)),
        tapeVert: parseInt2(getField(row, cols.tapeVert)),
        pc: parseNum(getField(row, cols.pc)),
        carreaux: parseInt2(getField(row, cols.carreaux)),

        facDevisAspReinstallation: cleanOrNull(getField(row, cols.facDevisAspReinstallation)),
        facDevisAsp: cleanOrNull(getField(row, cols.facDevisAspRetrait)),
        facDevisAspNettEntreposage: cleanOrNull(getField(row, cols.facDevisAspNettEntreposage)),
        factNumber: cleanOrNull(getField(row, cols.factNumber)),

        comment: currentComment,

        emailSent: parseBool(getField(row, cols.emailSent)),
        retraitDone: parseBool(getField(row, cols.retrait)),
        entreposage: parseBool(getField(row, cols.entreposage)),
        nettoyer: parseBool(getField(row, cols.nettoyer)),
        rebut: parseBool(getField(row, cols.rebut)),
        pickupDone: parseBool(getField(row, cols.pickupDone)),
        pickupRef: cleanOrNull(getField(row, cols.pickupRef)),
        confirmation: parseBool(getField(row, cols.confirmation)),
        confirmationDates: parseBool(getField(row, cols.confirmationDates)),
        fait: parseBool(getField(row, cols.fait)),
        payer: parseBool(getField(row, cols.payer)),
        solaFacture: parseBool(getField(row, cols.solaFacture)),
        ajustement: cleanOrNull(getField(row, cols.ajustement)),
        detailTapis: cleanOrNull(getField(row, cols.detailTapis)),
        datePrevue: cleanOrNull(getField(row, cols.datePrevue)),
      },
    });
    count++;
  }
  console.log(`Imported ${count} ${jobType} jobs from ${filename} (${year})`);
}

// ─── Nouvelle Installation CSVs (different column layout) ─────────

async function importNouvelleInstallation(filename: string, year: number) {
  const filePath = path.join(DATA_DIR, filename);
  const rows = parseCSV(filePath);
  if (rows.length < 2) return;

  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    if (joined.includes("no projet") || joined.includes("# projet")) {
      headerIdx = i;
      break;
    }
  }
  const headers = rows[headerIdx];

  // Nouvelle Installation columns
  const colProj = findCol(headers, "no projet", "# projet");
  const colName = findCol(headers, "nom", "noms");
  const colAddr = findCol(headers, "adresse");
  const colContact = findCol(headers, "contact");
  const colDate = findCol(headers, "date");
  const colHour = findCol(headers, "heure", "heures");
  const colCarpetType = findCol(headers, "type de tapis");
  const colOrderNum = findCol(headers, "no commande", "commande");
  const colRoll = findCol(headers, "rouleau");
  const colComment = findCol(headers, "commentaires");
  const colHIns = findCol(headers, "h/ins");
  const colMoulure = findCol(headers, "moulure");
  const colTape = findCol(headers, "tape");
  const colTapeVert = findCol(headers, "tape vert");
  const colPC = findCol(headers, "pc");
  const colPickupRef = findCol(headers, "pickup/ref");
  const colPickupDone = findCol(headers, "pickup fait");
  const colFDP = findCol(headers, "feuille de pose", "fdp");
  const colEmail = findCol(headers, "courriel");
  const colFact = findCol(headers, "facture", "fact #", "devis _ facture");
  const colSolaFact = findCol(headers, "sola facture", "sol fact", "sola fact");
  const colPostal = findCol(headers, "code postal");
  const colCity = findCol(headers, "ville");

  let count = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const projectNumber = clean(getField(row, colProj));
    if (!projectNumber || projectNumber.length < 4) continue;
    if (projectNumber.toLowerCase().includes("total")) continue;
    // Skip rows that look like subtotals
    if (!projectNumber.match(/\d/)) continue;

    const clientId = await ensureClient(projectNumber);
    if (!clientId) continue;

    const scheduledDate = parseFrenchDate(getField(row, colDate), year);

    // Update client
    const nameVal = cleanOrNull(getField(row, colName));
    const addrVal = cleanOrNull(getField(row, colAddr));
    const cityVal = cleanOrNull(getField(row, colCity));
    const postalVal = cleanOrNull(getField(row, colPostal));
    const emailVal = cleanOrNull(getField(row, colEmail));
    const clientUpdate: any = {};
    if (nameVal) clientUpdate.name = nameVal;
    if (addrVal) clientUpdate.address = addrVal;
    if (cityVal) clientUpdate.city = cityVal;
    if (postalVal) clientUpdate.postalCode = postalVal;
    if (emailVal) clientUpdate.email = emailVal;
    if (Object.keys(clientUpdate).length > 0) {
      await prisma.tapisClient.update({ where: { id: clientId }, data: clientUpdate });
    }

    await prisma.tapisJob.create({
      data: {
        companyId: COMPANY_ID!,
        clientId,
        jobType: "nouvelle_installation",
        season: guessSeason(scheduledDate),
        year,
        scheduledDate,
        hours: cleanOrNull(getField(row, colHour)),
        installHours: parseNum(getField(row, colHIns)),
        carpetType: cleanOrNull(getField(row, colCarpetType)),
        orderNumber: cleanOrNull(getField(row, colOrderNum)),
        rollCount: parseInt2(getField(row, colRoll)),
        moulurePL: parseInt2(getField(row, colMoulure)),
        tapeCount: parseInt2(getField(row, colTape)),
        tapeVert: parseInt2(getField(row, colTapeVert)),
        pc: parseNum(getField(row, colPC)),
        comment: cleanOrNull(getField(row, colComment)),
        pickupRef: cleanOrNull(getField(row, colPickupRef)),
        pickupDone: parseBool(getField(row, colPickupDone)),
        fdpPlan: parseBool(getField(row, colFDP)),
        facDevisAsp: cleanOrNull(getField(row, colFact)),
        solaFacture: parseBool(getField(row, colSolaFact)),
      },
    });
    count++;
  }
  console.log(`Imported ${count} nouvelle_installation jobs from ${filename} (${year})`);
}

// ─── 3. Import Pricing from Prix_2026.csv ─────────────────────────

async function importPricing() {
  const filePath = path.join(DATA_DIR, "Prix_2026.csv");
  const rows = parseCSV(filePath);
  if (rows.length === 0) return;

  const year = 2026;
  let count = 0;

  // Helper to extract price + unit from strings like "0,30$ / PC"
  function parsePriceEntry(s: string): { price: number; unit: string } | null {
    const c = clean(s);
    if (!c) return null;
    const m = c.match(/([\d\s,\.]+)\$\s*\/?\s*(.+)/);
    if (!m) return null;
    const price = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
    const unit = clean(m[2]);
    if (isNaN(price)) return null;
    return { price, unit };
  }

  // SERVICE section (row 1 = "Service" header, row 2 = service names, row 3 = prices)
  const serviceNames = ["retrait", "nettoyage", "entreposage", "transport", "reinstallation", "moulure_usage", "transport_extra", "rebut_usage"];
  if (rows.length >= 3) {
    for (let i = 0; i < Math.min(serviceNames.length, rows[2].length); i++) {
      const entry = parsePriceEntry(rows[2][i]);
      if (entry) {
        await prisma.tapisPricing.create({
          data: {
            companyId: COMPANY_ID!,
            serviceCategory: "service",
            serviceName: serviceNames[i],
            pricePerUnit: entry.price,
            unit: entry.unit,
            notes: cleanOrNull(rows[2][i]),
            year,
          },
        });
        count++;
      }
    }
  }

  // NEUF section (rows 4-6)
  const neufNames = ["installation", "transport", "adhesif", "moulure_neuve", "transport_extra", "rebut_neuf", "transport_mat_tech_vinyle", "transport_mat_tech_endos_gel"];
  if (rows.length >= 6) {
    for (let i = 0; i < Math.min(neufNames.length, rows[5].length); i++) {
      const entry = parsePriceEntry(rows[5][i]);
      if (entry) {
        await prisma.tapisPricing.create({
          data: {
            companyId: COMPANY_ID!,
            serviceCategory: "neuf",
            serviceName: neufNames[i],
            pricePerUnit: entry.price,
            unit: entry.unit,
            notes: cleanOrNull(rows[5][i]),
            year,
          },
        });
        count++;
      }
    }
  }

  // CAMION USINE section (rows 8-10, tiered pricing)
  const camionBrackets = ["0-2000pc", "2001-10000pc", "10001-25000pc", "25001+"];
  if (rows.length >= 10) {
    for (let i = 0; i < Math.min(camionBrackets.length, rows[9].length); i++) {
      const entry = parsePriceEntry(rows[9][i]);
      if (entry) {
        await prisma.tapisPricing.create({
          data: {
            companyId: COMPANY_ID!,
            serviceCategory: "camion_usine",
            serviceName: "transport",
            pricePerUnit: entry.price,
            unit: entry.unit,
            bracket: camionBrackets[i],
            year,
          },
        });
        count++;
      }
    }
  }

  // CAMION USINE TAPIS D'ENTRÉE (rows 13-15)
  const entreeBrackets = ["0-500pc", "501-2000pc", "2001-5000pc", "5001+"];
  if (rows.length >= 15) {
    for (let i = 0; i < Math.min(entreeBrackets.length, rows[14].length); i++) {
      const entry = parsePriceEntry(rows[14][i]);
      if (entry) {
        await prisma.tapisPricing.create({
          data: {
            companyId: COMPANY_ID!,
            serviceCategory: "camion_usine_entree",
            serviceName: "transport",
            pricePerUnit: entry.price,
            unit: entry.unit,
            bracket: entreeBrackets[i],
            year,
          },
        });
        count++;
      }
    }
  }

  // Charter/min notes from the side columns
  const charteNotes: string[] = [];
  for (const row of rows) {
    for (const cell of row) {
      if (clean(cell).toLowerCase().includes("déplacement minimum") || clean(cell).toLowerCase().includes("calcule heure")) {
        const note = clean(cell);
        if (note && !charteNotes.includes(note)) charteNotes.push(note);
      }
    }
  }
  for (const note of charteNotes) {
    await prisma.tapisPricing.create({
      data: {
        companyId: COMPANY_ID!,
        serviceCategory: "charte",
        serviceName: "note",
        pricePerUnit: 0,
        unit: "note",
        notes: note,
        year,
      },
    });
    count++;
  }

  console.log(`Imported ${count} pricing records from Prix_2026.csv`);
}

// ─── 4. Import Inventory ──────────────────────────────────────────

async function importInventory(filename: string, defaultYear: number) {
  const filePath = path.join(DATA_DIR, filename);
  const rows = parseCSV(filePath);
  if (rows.length < 2) return;

  // Inventaire_2026.csv has columns:
  // DATE, DURA DOT, EMPIRE, NEEDLE PIN 6', NEEDLE PIN 4' Brun, NEEDLE PIN 4' Beige, Marathon, "", MOULURE Noir, TAPE ECHO, TAPE VERT, TAPE PROSOL
  const headers = rows[0];
  const colDate = 0;
  const colDuraDot = findCol(headers, "dura dot");
  const colEmpire = findCol(headers, "empire");
  const colNP6 = findCol(headers, "needle pin 6");
  const colNP4B = findCol(headers, "needle pin 4' brun", "needle pin 4");
  const colNP4Be = findCol(headers, "needle pin 4' beige", "beige");
  const colMarathon = findCol(headers, "marathon");
  const colMoulure = findCol(headers, "moulure");
  const colTapeEcho = findCol(headers, "tape echo");
  const colTapeVert = findCol(headers, "tape vert");
  const colTapeProsol = findCol(headers, "tape prosol", "prosol");

  let count = 0;
  let lastDate: Date | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = clean(getField(row, colDate));
    const date = parseFrenchDate(dateStr, defaultYear);

    if (date) lastDate = date;
    // Only create record for rows with a date
    if (!date) continue;

    // Check if any actual values exist
    const vals = [colDuraDot, colEmpire, colNP6, colNP4B, colNP4Be, colMarathon, colMoulure, colTapeEcho, colTapeVert, colTapeProsol];
    const hasValues = vals.some((c) => parseInt2(getField(row, c)) !== null);
    if (!hasValues) continue;

    await prisma.tapisInventory.create({
      data: {
        companyId: COMPANY_ID!,
        date,
        duraDot: parseInt2(getField(row, colDuraDot)) ?? 0,
        empire: parseInt2(getField(row, colEmpire)) ?? 0,
        needlePin6: parseInt2(getField(row, colNP6)) ?? 0,
        needlePin4Brun: parseInt2(getField(row, colNP4B)) ?? 0,
        needlePin4Beige: parseInt2(getField(row, colNP4Be)) ?? 0,
        marathon: parseInt2(getField(row, colMarathon)) ?? 0,
        moulureNoir: parseInt2(getField(row, colMoulure)) ?? 0,
        tapeEcho: parseInt2(getField(row, colTapeEcho)) ?? 0,
        tapeVert: parseInt2(getField(row, colTapeVert)) ?? 0,
        tapeProsol: parseInt2(getField(row, colTapeProsol)) ?? 0,
      },
    });
    count++;
  }
  console.log(`Imported ${count} inventory records from ${filename}`);
}

// For Inventaire_2024.csv which has a totally different layout (purchase records)
async function importInventory2024() {
  const filePath = path.join(DATA_DIR, "Inventaire_2024.csv");
  const rows = parseCSV(filePath);
  if (rows.length < 2) return;

  let count = 0;
  // This file tracks purchase orders for tape/moulure supplies
  // Parse date entries and create inventory snapshot records
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Look for rows with dates in column 2 (format DD-MM-YYYY)
    const dateStr = clean(getField(row, 2));
    const date = parseFrenchDate(dateStr, 2024);
    if (!date) continue;

    const qty = parseInt2(getField(row, 4));
    if (qty === null) continue;

    const description = clean(getField(row, 0)) || "supplies";

    await prisma.tapisInventory.create({
      data: {
        companyId: COMPANY_ID!,
        date,
        duraDot: 0,
        empire: 0,
        needlePin6: 0,
        needlePin4Brun: 0,
        needlePin4Beige: 0,
        marathon: 0,
        moulureNoir: 0,
        tapeEcho: 0,
        tapeVert: 0,
        tapeProsol: 0,
        notes: `${description}: qty ${qty}`,
      },
    });
    count++;
  }
  console.log(`Imported ${count} inventory records from Inventaire_2024.csv`);
}

// ─── 5. Import Supplier Orders (Commande_Mat_Tech.csv) ────────────

async function importSupplierOrders() {
  const filePath = path.join(DATA_DIR, "Commande_Mat_Tech.csv");
  const rows = parseCSV(filePath);
  if (rows.length < 2) return;

  // Headers: MATTECH Commande, Qte en pieds/metre, # bdc solatheque, Date, Description, unité, Réf:, autre, Envoyé courriel Dom, PICK-UP
  let count = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const orderRef = cleanOrNull(getField(row, 2)); // # bdc solatheque
    if (!orderRef) continue;

    const quantity = parseNum(getField(row, 1));
    const dateStr = clean(getField(row, 3));
    const date = parseFrenchDate(dateStr, 2025);
    const description = cleanOrNull(getField(row, 4));
    const unit = cleanOrNull(getField(row, 5));
    const matTechRef = cleanOrNull(getField(row, 6));
    const color = cleanOrNull(getField(row, 7));
    const emailSent = parseBool(getField(row, 8));
    const pickupLocation = cleanOrNull(getField(row, 9));

    await prisma.tapisSupplierOrder.create({
      data: {
        companyId: COMPANY_ID!,
        orderRef,
        matTechRef,
        date,
        description,
        quantity,
        unit,
        color,
        emailSent,
        pickupLocation,
      },
    });
    count++;
  }
  console.log(`Imported ${count} supplier orders from Commande_Mat_Tech.csv`);
}

// ─── 6. Import Pickups (Pick-up_Dominic_-_Mat_Tech.csv) ───────────

async function importPickups() {
  const filePath = path.join(DATA_DIR, "Pick-up_Dominic_-_Mat_Tech.csv");
  const rows = parseCSV(filePath);
  if (rows.length < 3) return;

  // Find header row — contains "# Référence Mat Tech"
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    if (joined.includes("référence mat tech") || joined.includes("reference mat tech")) {
      headerIdx = i;
      break;
    }
  }
  const headers = rows[headerIdx];

  const colMatTech = findCol(headers, "référence mat tech", "reference mat tech");
  const colOrder = findCol(headers, "numéro de commande", "numero de commande");
  const colRolls = 4; // column after order ref
  const colDesc = findCol(headers, "description");
  const colProject = findCol(headers, "projet");
  const colOrderDate = 7; // order date column
  const colPickupDate = 8; // pickup date column
  const colDone = 9; // done boolean

  let count = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const matTechRef = cleanOrNull(getField(row, colMatTech));
    const orderRef = cleanOrNull(getField(row, colOrder));
    if (!matTechRef && !orderRef) continue;

    const rollCount = parseInt2(getField(row, colRolls));
    const description = cleanOrNull(getField(row, colDesc));
    const project = cleanOrNull(getField(row, colProject));
    const orderDate = parseFrenchDate(getField(row, colOrderDate), 2025);
    const pickupDate = parseFrenchDate(getField(row, colPickupDate), 2025);
    const done = parseBool(getField(row, colDone));

    await prisma.tapisPickup.create({
      data: {
        companyId: COMPANY_ID!,
        matTechRef,
        orderRef,
        rollCount,
        description,
        project,
        orderDate,
        pickupDate,
        done,
      },
    });
    count++;
  }
  console.log(`Imported ${count} pickups from Pick-up_Dominic_-_Mat_Tech.csv`);
}

// ─── 7. Import Maintenance (Entretien.csv) ────────────────────────

async function importMaintenance() {
  const filePath = path.join(DATA_DIR, "Entretien.csv");
  const rows = parseCSV(filePath);
  if (rows.length === 0) return;

  let count = 0;
  let currentPO = "";
  let currentDate: Date | null = null;

  // The Entretien file has a repeating block structure:
  // Row with P.O. number: "0383-ET-251", "Roul #", "Qté en PL", ...
  // Row with date: "27 sept.", roll number, qty, ...
  // Subsequent rows: project ref, location, qty distribution
  // Then it repeats with another P.O. block

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cell0 = clean(getField(row, 0));

    // Detect P.O. header row
    if (cell0.match(/^\d{4}-ET-\d+[a-z]?$/i) || cell0.match(/^P\.O\.\s/i)) {
      const poMatch = cell0.match(/(\d{4}-ET-\d+[a-z]?)/i);
      if (poMatch) currentPO = poMatch[1];
      // Next row should have the date
      if (i + 1 < rows.length) {
        const nextRow = rows[i + 1];
        const dateStr = clean(getField(nextRow, 0));
        currentDate = parseFrenchDate(dateStr, 2025);
      }
      continue;
    }

    // Skip label/header rows and non-data
    if (cell0.toLowerCase().includes("design") || cell0.toLowerCase().includes("novanop")) continue;
    // Parse data rows — each pair of columns is (Roul #, Qté en PL) for a roll
    // and below that: (location, qty distributed)

    // We parse roll entries from the date row and location rows
    // Look for rows that have roll numbers (integers) in even positions
    for (let col = 1; col < row.length; col += 3) {
      // Each roll group takes 3 columns: Roul#, QtyPL, empty
      const rollStr = clean(getField(row, col));
      const qtyStr = clean(getField(row, col + 1));

      if (!rollStr && !qtyStr) continue;

      // If this is a location row (text in rollStr, number in qtyStr)
      const qty = parseInt2(qtyStr);
      const location = rollStr;

      if (location && qty !== null && qty > 0 && !location.match(/^#?\d+$/) && location !== "Roul #" && location !== "Qté en PL") {
        await prisma.tapisMaintenance.create({
          data: {
            companyId: COMPANY_ID!,
            poNumber: currentPO || null,
            rollNumber: null,
            quantityPL: qty,
            location,
            date: currentDate,
          },
        });
        count++;
      } else if (rollStr.match(/^\d+$/) && qty !== null) {
        // This is a roll header row — roll number + total qty
        const rollNum = parseInt(rollStr);
        await prisma.tapisMaintenance.create({
          data: {
            companyId: COMPANY_ID!,
            poNumber: currentPO || null,
            rollNumber: rollNum,
            quantityPL: qty,
            location: null,
            date: currentDate,
          },
        });
        count++;
      }
    }
  }
  console.log(`Imported ${count} maintenance records from Entretien.csv`);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Tapis Import Script ===`);
  console.log(`Company ID: ${COMPANY_ID}`);
  console.log(`Data dir:   ${DATA_DIR}\n`);

  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id: COMPANY_ID! } });
  if (!company) {
    console.error(`ERROR: Company ${COMPANY_ID} not found in database.`);
    process.exit(1);
  }
  console.log(`Company: ${company.name}\n`);

  // ── Step 1: Clients ──
  console.log("--- Step 1: Importing Clients ---");
  await importClients();

  // ── Step 2: Seasonal Jobs ──
  console.log("\n--- Step 2: Importing Seasonal Jobs ---");

  // Retrait CSVs
  await importSeasonalJobCSV("Retrait_2025.csv", "retrait", 2025, "printemps");
  await importSeasonalJobCSV("Retrait_-_printemps_2024.csv", "retrait", 2024, "printemps");

  // Reinstallation CSVs
  await importSeasonalJobCSV("Réinstallation_2025.csv", "reinstallation", 2025, "automne");
  await importSeasonalJobCSV("Réinstallation_2024.csv", "reinstallation", 2024, "automne");
  await importSeasonalJobCSV("Automne_2023_Réintallation.csv", "reinstallation", 2023, "automne");

  // Enlèvement
  await importSeasonalJobCSV("Enlèvement_2026.csv", "enlevement", 2026, "printemps");

  // Nouvelle Installation (different format)
  await importNouvelleInstallation("Nouvelle_Installation.csv", 2025);
  await importNouvelleInstallation("Nouvelle_Installation_2024.csv", 2024);
  await importNouvelleInstallation("Nouvelle_Installation_2023.csv", 2023);
  await importNouvelleInstallation("Nouv_inst_2023.csv", 2023);

  // ── Step 3: Pricing ──
  console.log("\n--- Step 3: Importing Pricing ---");
  await importPricing();

  // ── Step 4: Inventory ──
  console.log("\n--- Step 4: Importing Inventory ---");
  await importInventory("Inventaire_2026.csv", 2026);
  await importInventory2024();

  // ── Step 5: Supplier Orders ──
  console.log("\n--- Step 5: Importing Supplier Orders ---");
  await importSupplierOrders();

  // ── Step 6: Pickups ──
  console.log("\n--- Step 6: Importing Pickups ---");
  await importPickups();

  // ── Step 7: Maintenance ──
  console.log("\n--- Step 7: Importing Maintenance ---");
  await importMaintenance();

  // ── Summary ──
  const [clients, jobs, pricing, inventory, orders, pickups, maintenance] = await Promise.all([
    prisma.tapisClient.count({ where: { companyId: COMPANY_ID! } }),
    prisma.tapisJob.count({ where: { companyId: COMPANY_ID! } }),
    prisma.tapisPricing.count({ where: { companyId: COMPANY_ID! } }),
    prisma.tapisInventory.count({ where: { companyId: COMPANY_ID! } }),
    prisma.tapisSupplierOrder.count({ where: { companyId: COMPANY_ID! } }),
    prisma.tapisPickup.count({ where: { companyId: COMPANY_ID! } }),
    prisma.tapisMaintenance.count({ where: { companyId: COMPANY_ID! } }),
  ]);

  console.log(`\n=== Import Complete ===`);
  console.log(`  Clients:         ${clients}`);
  console.log(`  Jobs:            ${jobs}`);
  console.log(`  Pricing:         ${pricing}`);
  console.log(`  Inventory:       ${inventory}`);
  console.log(`  Supplier Orders: ${orders}`);
  console.log(`  Pickups:         ${pickups}`);
  console.log(`  Maintenance:     ${maintenance}`);
  console.log();
}

main()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
