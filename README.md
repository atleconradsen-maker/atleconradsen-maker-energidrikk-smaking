# Energidrikk Smaking

Nettside for energidrikk-testen, hostet på GitHub Pages.
Dataene hentes fra Google-regnearket «Energidrikk Smaking – tester» (mappen «Energidrikk Smaking» i Drive).

## Legge inn en test fra mobilen
Trykk «📸 Legg inn test» på forsiden (`legg-inn.html`): ta bilde av boksen, velg merke og type, pris og størrelse,
trykk på hvem som smakte og gi score. Siden spør «Mener du …?» når et navn ligner en drikk som er testet før.
Testen lagres som en ny rad i regnearket, og bildet havner i Drive-mappen «Bilder».

### Engangsoppsett (Apps Script)
1. Åpne regnearket → Utvidelser → Apps Script.
2. Slett det som står der og lim inn alt fra `apps-script/Kode.gs`. Lagre.
3. Velg funksjonen `testTilgang` og trykk Kjør. Godkjenn tilgangene (Avansert → Gå til prosjektet).
4. Distribuer → Ny distribusjon → Type: Nettapp. Kjør som: **Meg**. Hvem har tilgang: **Alle**. Distribuer.
5. Kopier nettapp-lenken (slutter på `/exec`) og lim den inn som `SCRIPT_URL` i `config.js`.

Endrer du skriptet senere: Distribuer → Administrer distribusjoner → Rediger → Ny versjon (lenken blir den samme).

## Manuelt i regnearket
Én rad per drikk: År, Uke, Drikk, Merke, Pris (kr), Størrelse (cl), «Navn – Smak», «Navn – Smak vs pris» for hver testperson, Kommentar, Bilde.
Feil eller spam: slett raden i regnearket. Siden henter nye data automatisk.

Regnearket må være delt som «Alle med lenken kan se». Bytt regneark i `config.js`.
