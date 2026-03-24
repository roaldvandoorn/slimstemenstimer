# Installatiegids — De Slimste Mens Timer

Deze gids legt stap voor stap uit hoe je De Slimste Mens Timer instelt voor een spelletjesavond. Je hebt geen technische kennis nodig.

---

## Wat heb je nodig?

| Wat | Wie |
|-----|-----|
| Eén Windows-pc (laptop of desktop) als **server** | De gastheer/gastvrouw |
| Eén Android-telefoon per speler | Elke speler |
| Allemaal verbonden met **hetzelfde Wi-Fi-netwerk** | — |

---

## Stap 1 — Server installeren (eenmalig, op de pc van de gastheer)

1. Ga naar de [GitHub Releases-pagina](../../releases/latest) van dit project.
2. Download het bestand **`SlimsteMensTimerServer-vX.X.X-Setup.exe`**.
3. Dubbelklik op het installatiebestand en klik op **Volgende** / **Installeren**.
4. De server wordt automatisch gestart als Windows-service en start voortaan ook automatisch mee op bij het opstarten van de pc.

> **Klaar!** Je hoeft de server nooit meer handmatig te starten.
> Via het Startmenu onder *Slimste Mens Timer Server* vind je snelkoppelingen om de server te starten of stoppen.

---

## Stap 2 — App installeren (eenmalig, op elke telefoon)

1. Open de **Google Play Store** op de Android-telefoon.
2. Zoek op **"De Slimste Mens Timer"** en installeer de app.
3. Of scan de QR-code op de lobbypagina (zie Stap 3) om direct naar de app te gaan.

---

## Stap 3 — Spel starten

### Op de pc (gastheer)

1. Open een browser en ga naar:
   **`http://localhost:5000`**
2. Klik op **Nieuwe Sessie**.
3. Er verschijnt een QR-code en een sessiecode (bijv. `HJKM3P`).

### Op elke telefoon (spelers)

1. Open de **Slimste Mens Timer**-app.
2. Tik op het hamburger-menu (☰, linksboven) → **Aanmelden bij spel**.
3. Scan de QR-code op het scherm van de gastheer, of voer de sessiecode handmatig in.
4. Voer je naam in en tik op **Aanmelden**.

### Spel starten

1. Zodra alle spelers zijn aangemeld, klikt de gastheer op **Start Spel**.
2. Het scorebord verschijnt automatisch in de browser.

---

## Tijdens het spel

| Knop | Wat doet het? |
|------|---------------|
| **Start / Stop** | Timer starten of pauzeren |
| **+20** | 20 seconden bij de score optellen |
| **−20** | 20 seconden van de score aftrekken (minimaal 0) |
| Hamburger-menu → *Score instellen* | Direct een specifieke score invoeren |
| Hamburger-menu → *Reset score* | Score terugzetten naar 60 |

Scores worden direct zichtbaar op het scorebord in de browser van de gastheer.

---

## Spel beëindigen

Klik op **Beëindig spel** op het scorebord. Er verschijnt een **Nieuw Spel**-knop om een volgende ronde te starten.

---

## Problemen?

### De app kan de server niet vinden
- Zorg dat de pc en alle telefoons verbonden zijn met **hetzelfde Wi-Fi-netwerk**.
- Controleer of de **server actief is**: open `http://localhost:5000/status.html` in de browser op de pc. Je ziet dan of de server online is.
- Als de pc een **VPN** gebruikt, schakel die dan uit voor je de server start — een VPN kan het lokale netwerkadres verbergen.

### De server reageert niet
- Open het Startmenu → *Slimste Mens Timer Server* → **Start Server** (vereist administratorrechten).
- Of start de server opnieuw via `http://localhost:5000/status.html`.

### Een speler valt eruit tijdens het spel
- De speler tikt nogmaals op hamburger-menu → **Aanmelden bij spel** en scant de QR-code opnieuw.
- Zijn/haar score is dan terug zichtbaar op het scorebord.

---

## Server stoppen (optioneel)

De server draait als Windows-service en verbruikt nauwelijks bronnen. Je hoeft hem niet te stoppen.
Wil je hem toch stoppen? Ga naar Startmenu → *Slimste Mens Timer Server* → **Stop Server**.
