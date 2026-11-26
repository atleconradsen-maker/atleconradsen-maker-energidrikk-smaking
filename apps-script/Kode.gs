/**
 * Mottaker for «Legg inn test» (legg-inn.html) på Energidrikk Smaking.
 * Limes inn i regnearket «Energidrikk Smaking – tester» under Utvidelser → Apps Script.
 * Skriver én rad per drikk (År, Uke, Drikk, Merke, Pris (kr), Størrelse (cl),
 * «Navn – Smak», «Navn – Smak vs pris» …, Kommentar, Bilde) og lagrer bildet i Drive-mappen «Bilder».
 */
const BILDEMAPPE = 'Bilder';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const data = JSON.parse(e.postData.contents);
    const t = data.test || {};
    const merke = str(t.merke, 40), drikk = str(t.drikk, 60);
    if (!merke || !drikk) return svar({ok: false, feil: 'Mangler merke eller type'});
    const testere = (data.testere || []).slice(0, 12)
      .map(x => ({navn: str(x.navn, 40), smak: score(x.smak), verdi: score(x.verdi)}))
      .filter(x => x.navn && (x.smak != null || x.verdi != null));
    if (!testere.length) return svar({ok: false, feil: 'Mangler score'});

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    let head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const col = (...navn) => head.findIndex(h => navn.some(n => norm(h) === norm(n) || norm(h).startsWith(norm(n))));

    // Bruk skrivemåten som allerede står i arket
    const iMerke = col('merke'), iDrikk = col('drikk');
    const rader = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, head.length).getValues() : [];
    const kjentMerke = rader.map(r => String(r[iMerke])).find(m => key(m) === key(merke)) || merke;
    const kjentDrikk = rader.filter(r => key(r[iMerke]) === key(merke)).map(r => String(r[iDrikk])).find(d => key(d) === key(drikk)) || drikk;

    // Finn (eller lag) kolonnene for hver tester
    const testerKol = navn => {
      let s = -1, v = -1;
      head.forEach((h, i) => {
        const m = /^(.+?)\s*[–—-]\s*(smak vs\.? pris|smak)\s*$/i.exec(h.trim());
        if (!m || key(m[1]) !== key(navn)) return;
        if (/^smak$/i.test(m[2])) s = i; else v = i;
      });
      return {s, v};
    };
    for (const x of testere) {
      const k = testerKol(x.navn);
      if (k.s >= 0 && k.v >= 0) continue;
      let at = col('kommentar'); if (at < 0) at = head.length;
      sheet.insertColumnsBefore(at + 1, 2);
      sheet.getRange(1, at + 1, 1, 2).setValues([[x.navn + ' – Smak', x.navn + ' – Smak vs pris']]);
      head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    }

    const bildeUrl = data.bilde ? lagreBilde(data.bilde, kjentMerke + ' ' + kjentDrikk) : '';
    const rad = head.map(() => '');
    const sett = (i, v) => { if (i >= 0) rad[i] = v; };
    const now = new Date();
    sett(col('år', 'ar'), num(t.aar) || now.getFullYear());
    sett(col('uke'), num(t.uke) || '');
    sett(iDrikk, kjentDrikk);
    sett(iMerke, kjentMerke);
    sett(col('pris'), num(t.pris) ?? '');
    sett(col('størrelse', 'storrelse'), num(t.cl) ?? '');
    for (const x of testere) {
      const k = testerKol(x.navn);
      sett(k.s, x.smak ?? '');
      sett(k.v, x.verdi ?? '');
    }
    sett(col('kommentar'), str(t.kommentar, 400));
    sett(col('bilde'), bildeUrl);
    sheet.appendRow(rad);
    return svar({ok: true, drikk: kjentMerke + ' ' + kjentDrikk});
  } catch (err) {
    return svar({ok: false, feil: String(err && err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function doGet() { return svar({ok: true, info: 'Energidrikk Smaking – mottaker kjører'}); }

function lagreBilde(dataUrl, navn) {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(dataUrl));
  if (!m) return '';
  const bytes = Utilities.base64Decode(m[3]);
  if (bytes.length > 8 * 1024 * 1024) return '';
  const fil = finnMappe().createFile(Utilities.newBlob(bytes, m[1], navn.replace(/[^\wæøåÆØÅ\- ]/g, '').trim() + ' ' + Utilities.formatDate(new Date(), 'Europe/Oslo', 'yyyy-MM-dd HHmm') + '.jpg'));
  fil.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return fil.getUrl();
}

function finnMappe() {
  const arkFil = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const foreldre = arkFil.getParents();
  const forelder = foreldre.hasNext() ? foreldre.next() : DriveApp.getRootFolder();
  const finn = forelder.getFoldersByName(BILDEMAPPE);
  return finn.hasNext() ? finn.next() : forelder.createFolder(BILDEMAPPE);
}

// Kjør denne én gang fra editoren for å gi skriptet tilgang til Drive og regnearket.
function testTilgang() { Logger.log(finnMappe().getName() + ' / ' + SpreadsheetApp.getActiveSpreadsheet().getName()); }

const svar = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const str = (v, n) => { const s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); return /^[=+\-@]/.test(s) ? "'" + s : s; };
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; };
const score = v => { const n = num(v); return n == null ? null : Math.min(10, Math.max(1, Math.round(n))); };
const norm = s => String(s || '').toLowerCase().trim();
const key = s => String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
