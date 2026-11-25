// Parses the Google Sheet (as CSV) into test objects.
// Used both by /api/tests (Node) and directly in the browser as a fallback.
(function (root) {
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => String(v).trim() !== ''));
  }

  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  function toNum(v) {
    if (v == null) return null;
    let s = String(v).trim().replace(/\s|kr|ml/gi, '');
    if (!s) return null;
    // "1.234,50" -> 1234.50 ; "29,90" -> 29.90
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  // Turns a Google Drive share link into a direct image URL; other http(s) links pass through.
  function imageUrl(v) {
    const s = String(v || '').trim();
    if (!/^https?:\/\//i.test(s)) return null;
    const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{20,})/i.exec(s) || /[?&]id=([\w-]{20,})/.exec(s);
    if (m && /google\./i.test(s)) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    return s.slice(0, 1000);
  }
  const score = v => { const n = toNum(v); return n == null ? null : Math.min(10, Math.max(1, Math.round(n))); };

  function parseSheet(csvText) { return parseRows(parseCSV(csvText)); }

  // Google Visualization JSON table -> rows of strings/numbers (header row first)
  function gvizToRows(table) {
    const head = (table.cols || []).map(c => c.label || '');
    const body = (table.rows || []).map(r => (r.c || []).map(c => {
      if (!c || c.v == null) return '';
      return typeof c.v === 'number' ? c.v : String(c.f != null && typeof c.v !== 'string' ? c.f : c.v);
    }));
    return [head, ...body].filter((r, i) => i === 0 || r.some(v => String(v).trim() !== ''));
  }

  function parseRows(rows) {
    if (!rows.length) return {tests: [], testers: []};
    const head = rows[0].map(norm);
    const col = (...names) => head.findIndex(h => names.some(n => h === n || h.startsWith(n)));
    const iYear = col('år', 'ar', 'year');
    const iWeek = col('uke', 'week');
    const iDrink = col('drikk', 'navn', 'drink');
    const iBrand = col('merke', 'brand');
    const iPrice = col('pris', 'price');
    const iMl = col('størrelse', 'ml', 'storrelse');
    const iNotes = col('kommentar', 'notat', 'notes');
    let iImg = col('bilde', 'foto', 'image', 'bilder');
    if (iImg < 0) { // no header: use the first column that contains a link
      const w = Math.max(...rows.map(r => r.length));
      for (let c = 0; c < w && iImg < 0; c++) if (rows.slice(1).some(r => /^https?:\/\//i.test(String(r[c] || '').trim()))) iImg = c;
    }

    // Tester columns: "<Navn> – Smak" and "<Navn> – Smak vs pris"
    const testers = new Map();
    rows[0].forEach((raw, i) => {
      const m = /^(.+?)\s*[–—-]\s*(smak vs\.? pris|verdi|smak)\s*$/i.exec(String(raw).trim());
      if (!m) return;
      const name = m[1].trim();
      if (!testers.has(name)) testers.set(name, {name, taste: -1, value: -1});
      if (/^smak$/i.test(m[2])) testers.get(name).taste = i; else testers.get(name).value = i;
    });

    const thisYear = new Date().getFullYear();
    const out = [];
    rows.slice(1).forEach((r, idx) => {
      const drink = iDrink >= 0 ? String(r[iDrink] || '').trim() : '';
      if (!drink) return;
      const year = (iYear >= 0 && toNum(r[iYear])) || thisYear;
      const wk = iWeek >= 0 ? toNum(r[iWeek]) : null;
      const scores = [...testers.values()].map(t => ({
        name: t.name,
        taste: t.taste >= 0 ? score(r[t.taste]) : null,
        value: t.value >= 0 ? score(r[t.value]) : null
      })).filter(s => s.taste != null || s.value != null);
      out.push({
        id: 'r' + (idx + 2),
        drink: drink.slice(0, 80),
        brand: iBrand >= 0 ? String(r[iBrand] || '').trim().slice(0, 60) : '',
        week: wk ? `${Math.round(year)}-W${String(Math.round(wk)).padStart(2, '0')}` : '',
        price: iPrice >= 0 ? toNum(r[iPrice]) : null,
        // Størrelse: tall opp til 100 er centiliter (33 = 33 cl = 330 ml)
        ml: (() => { const v = iMl >= 0 ? toNum(r[iMl]) : null; return v != null && v > 0 && v <= 100 ? v * 10 : v; })(),
        image: iImg >= 0 ? imageUrl(r[iImg]) : null,
        notes: iNotes >= 0 ? String(r[iNotes] || '').trim().slice(0, 400) : '',
        scores
      });
    });
    return {tests: out, testers: [...testers.keys()]};
  }

  const api = {parseSheet, parseRows, gvizToRows, parseCSV, imageUrl};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EDParse = api;
})(typeof self !== 'undefined' ? self : this);
