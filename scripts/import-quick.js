const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'tapis-sheets');
const CID = process.env.COMPANY_ID;
const db = new Client({ connectionString: process.env.DIRECT_URL });

// Simple CSV parser handling quoted fields
function parseCSV(text) {
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let inQuote = false, field = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { row.push(field.trim()); field = ''; continue; }
      field += ch;
    }
    row.push(field.trim());
    result.push(row);
  }
  return result;
}

function parseNum(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseBool(s) {
  return s === 'TRUE' || s === 'true';
}

// French month names
const MONTHS_FR = { 'janv': 0, 'jan': 0, 'février': 1, 'fev': 1, 'fevr': 1, 'mars': 2, 'mar': 2, 'avril': 3, 'avr': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'juillet': 6, 'août': 7, 'aout': 7, 'sept': 8, 'septembre': 8, 'octobre': 9, 'oct': 9, 'novembre': 10, 'nov': 10, 'décembre': 11, 'dec': 11, 'decembre': 11 };

function parseFrenchDate(s, defaultYear) {
  if (!s) return null;
  s = s.trim().replace(/\./g, '');
  // Try "DD month" or "month DD"
  for (const [name, idx] of Object.entries(MONTHS_FR)) {
    if (s.toLowerCase().includes(name)) {
      const nums = s.match(/\d+/g);
      if (nums && nums.length >= 1) {
        const day = parseInt(nums[0]);
        const year = nums.length >= 2 ? parseInt(nums[1]) : defaultYear;
        return new Date(year > 100 ? year : 2000 + year, idx, day).toISOString();
      }
    }
  }
  // Try DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (m) {
    const y = parseInt(m[3]) > 100 ? parseInt(m[3]) : 2000 + parseInt(m[3]);
    return new Date(y, parseInt(m[2]) - 1, parseInt(m[1])).toISOString();
  }
  return null;
}

async function run() {
  await db.connect();
  console.log('Connected. Company:', CID);

  // Get client map: projectNumber -> id
  const clientRes = await db.query('SELECT id, "projectNumber" FROM "TapisClient" WHERE "companyId" = $1', [CID]);
  const clientMap = {};
  for (const r of clientRes.rows) clientMap[r.projectNumber] = r.id;
  console.log(`Loaded ${Object.keys(clientMap).length} client IDs`);

  // Import retrait jobs
  const retraitFiles = [
    { file: 'Retrait_2025.csv', year: 2025, type: 'retrait', season: 'printemps' },
    { file: 'Retrait_-_printemps_2024.csv', year: 2024, type: 'retrait', season: 'printemps' },
  ];

  const reinstallFiles = [
    { file: 'Réinstallation_2025.csv', year: 2025, type: 'reinstallation', season: 'automne' },
    { file: 'Réinstallation_2024.csv', year: 2024, type: 'reinstallation', season: 'automne' },
    { file: 'Automne_2023_Réintallation.csv', year: 2023, type: 'reinstallation', season: 'automne' },
  ];

  const nouvelleFiles = [
    { file: 'Nouvelle_Installation.csv', year: 2025, type: 'nouvelle_installation', season: null },
    { file: 'Nouvelle_Installation_2024.csv', year: 2024, type: 'nouvelle_installation', season: null },
    { file: 'Nouvelle_Installation_2023.csv', year: 2023, type: 'nouvelle_installation', season: null },
    { file: 'Nouv_inst_2023.csv', year: 2023, type: 'nouvelle_installation', season: null },
  ];

  const enlevementFiles = [
    { file: 'Enlèvement_2026.csv', year: 2026, type: 'enlevement', season: 'printemps' },
  ];

  let totalJobs = 0;

  for (const spec of [...retraitFiles, ...reinstallFiles, ...enlevementFiles]) {
    const filePath = path.join(DATA_DIR, spec.file);
    if (!fs.existsSync(filePath)) { console.log('SKIP (not found):', spec.file); continue; }
    const rows = parseCSV(fs.readFileSync(filePath, 'utf-8'));
    if (rows.length < 2) continue;

    // Find column indices from header (row 0)
    const hdr = rows[0].map(h => h.toLowerCase());
    const colProjet = hdr.findIndex(h => h.includes('projet'));
    const colNom = hdr.findIndex(h => h.includes('noms') || h.includes('nom'));
    const colPC = hdr.findIndex(h => h.includes('pc'));
    const colMoulures = hdr.findIndex(h => h.includes('moulure') && !h.includes('changer'));
    const colGars = hdr.findIndex(h => h.includes('nbr gars') || h.includes('gars'));
    const colHIns = hdr.findIndex(h => h.includes('h/ins'));
    const colDate = hdr.findIndex(h => h.includes('date') && (h.includes('réinstallation') || h.includes('retrait') || !h.includes('prévue')));
    const colHeures = hdr.findIndex(h => h.includes('heures') || h.includes('heure'));
    const colFait = hdr.findIndex(h => h === 'fait');
    const colConfirm = hdr.findIndex(h => h.includes('confirmation') && !h.includes('dates'));
    const colEmail = hdr.findIndex(h => h.includes('courriel envoyé') || h.includes('courriel envoye'));

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const projet = colProjet >= 0 ? r[colProjet] : '';
      if (!projet || !projet.match(/\d/)) continue;
      const clientId = clientMap[projet];
      if (!clientId) continue;

      const pc = colPC >= 0 ? parseNum(r[colPC]) : null;
      const moulures = colMoulures >= 0 ? parseNum(r[colMoulures]) : null;
      const gars = colGars >= 0 ? parseNum(r[colGars]) : null;
      const hIns = colHIns >= 0 ? parseNum(r[colHIns]) : null;
      const dateStr = colDate >= 0 ? r[colDate] : '';
      const scheduledDate = parseFrenchDate(dateStr, spec.year);
      const heures = colHeures >= 0 ? r[colHeures] : null;
      const fait = colFait >= 0 ? parseBool(r[colFait]) : false;
      const confirm = colConfirm >= 0 ? parseBool(r[colConfirm]) : false;
      const emailSent = colEmail >= 0 ? parseBool(r[colEmail]) : false;

      await db.query(`INSERT INTO "TapisJob" (id, "companyId", "clientId", "jobType", season, year, "scheduledDate", hours, "crewSize", "installHours", pc, "moulurePL", fait, confirmation, "emailSent", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [CID, clientId, spec.type, spec.season, spec.year, scheduledDate, heures, gars ? Math.round(gars) : null, hIns, pc, moulures ? Math.round(moulures) : null, fait, confirm, emailSent]);
      count++;
    }
    totalJobs += count;
    console.log(`${spec.file}: ${count} jobs imported`);
  }

  // Nouvelle installation
  for (const spec of nouvelleFiles) {
    const filePath = path.join(DATA_DIR, spec.file);
    if (!fs.existsSync(filePath)) { console.log('SKIP:', spec.file); continue; }
    const rows = parseCSV(fs.readFileSync(filePath, 'utf-8'));
    if (rows.length < 2) continue;

    const hdr = rows[0].map(h => h.toLowerCase());
    const colProjet = hdr.findIndex(h => h.includes('projet') || h.includes('no projet'));
    const colNom = hdr.findIndex(h => h.includes('nom'));
    const colDate = hdr.findIndex(h => h.includes('date'));
    const colPC = hdr.findIndex(h => h === 'pc' || h.includes(' pc'));
    const colTapis = hdr.findIndex(h => h.includes('type de tapis') || h.includes('tapis'));
    const colCommande = hdr.findIndex(h => h.includes('commande'));
    const colRouleau = hdr.findIndex(h => h.includes('rouleau'));
    const colMoulure = hdr.findIndex(h => h.includes('moulure') && !h.includes('changer'));
    const colTape = hdr.findIndex(h => h === 'tape' || h.includes(' tape'));
    const colFait = hdr.findIndex(h => h === 'fait' || h.includes('fait'));

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const projet = colProjet >= 0 ? r[colProjet] : '';
      if (!projet || !projet.match(/\d/)) continue;
      const clientId = clientMap[projet];
      if (!clientId) {
        // Try to create a stub client
        const res = await db.query('INSERT INTO "TapisClient" (id, "companyId", "projectNumber", name, "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW()) ON CONFLICT ("companyId", "projectNumber") DO NOTHING RETURNING id', [CID, projet, colNom >= 0 ? r[colNom] || projet : projet]);
        if (res.rows[0]) clientMap[projet] = res.rows[0].id;
        else {
          const existing = await db.query('SELECT id FROM "TapisClient" WHERE "companyId" = $1 AND "projectNumber" = $2', [CID, projet]);
          if (existing.rows[0]) clientMap[projet] = existing.rows[0].id;
          else continue;
        }
      }

      const dateStr = colDate >= 0 ? r[colDate] : '';
      const scheduledDate = parseFrenchDate(dateStr, spec.year);
      const pc = colPC >= 0 ? parseNum(r[colPC]) : null;
      const carpetType = colTapis >= 0 ? r[colTapis] : null;
      const orderNumber = colCommande >= 0 ? r[colCommande] : null;
      const rollCount = colRouleau >= 0 ? parseNum(r[colRouleau]) : null;

      await db.query(`INSERT INTO "TapisJob" (id, "companyId", "clientId", "jobType", season, year, "scheduledDate", "carpetType", "orderNumber", "rollCount", pc, fait, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [CID, clientMap[projet], spec.type, spec.season, spec.year, scheduledDate, carpetType, orderNumber, rollCount ? Math.round(rollCount) : null, pc, false]);
      count++;
    }
    totalJobs += count;
    console.log(`${spec.file}: ${count} jobs imported`);
  }

  console.log(`\nTotal jobs imported: ${totalJobs}`);

  // Verify
  const jobCount = await db.query('SELECT COUNT(*) FROM "TapisJob" WHERE "companyId" = $1', [CID]);
  console.log('Total jobs in DB:', jobCount.rows[0].count);

  await db.end();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
