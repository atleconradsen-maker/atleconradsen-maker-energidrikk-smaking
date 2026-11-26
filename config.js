// ID-en til Google-regnearket «Energidrikk Smaking – tester».
// Regnearket må være delt som «Alle med lenken kan se».
(function (root) {
  const cfg = { SHEET_ID: '1UGdkX5QQOBn9tS6UIjl4gP5LLvNqNf1fkAS0GWVVFBk',
    // Adressen til Apps Script-nettappen (apps-script/Kode.gs) som lagrer nye tester. Lim inn …/exec-lenken her.
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzz3R5GfBdEAmzyDi0IxP1_TwMJAz6p98GaPNKLSsD7Rr9QBh00Srej4QIsIO-aPuA6uw/exec' };
  if (typeof module !== 'undefined' && module.exports) module.exports = cfg;
  else root.EDConfig = cfg;
})(typeof self !== 'undefined' ? self : this);
