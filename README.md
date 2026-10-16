# Stuard

Een Nederlandstalige webapp voor betaalde praktijkervaring bij kleine bedrijven. De eerste pilot heeft drie rollen: student, bedrijfsbegeleider en Stuard-beheer.

Het volledige product- en bouwplan staat in [docs/PROJECTPLAN.md](docs/PROJECTPLAN.md). De gebruiker koos de volledige pilot en vroeg na het plan direct te bouwen.

## Lokaal proberen

Vereist: **Node.js 24** en npm. Er zijn geen externe API-sleutels nodig.

```bash
cd /workspace/Stuard
npm ci
npm run demo
```

Vite draait op poort 5173; de API op 3001. Open de app via de lokale browser/ontwikkelomgeving. Kies **Inloggen** en vervolgens **Beheer**, **Student** of **Bedrijf** in het demovak. De fictieve gegevens zijn overal als demo gemarkeerd. Uitloggen maakt het mogelijk een andere rol te kiezen.

De demo gebruikt `.data/demo.sqlite`. De standaardmodus zonder demo gebruikt `.data/stuard.sqlite`. Beide bestanden en eventuele WAL-bestanden blijven lokaal en staan niet in Git. Start de demo niet met echte persoonsgegevens. De server weigert een demodatabase in de normale modus en weigert demo-toegang op een bestaande echte database. Een demo kan niet onder `NODE_ENV=production` starten.

`.env.example` is documentatie; de applicatie leest variabelen uit de procesomgeving. Het bestand wordt niet automatisch ingeladen.

## Wat werkt

- Publieke website met uitleg, twee aanmeldroutes en pilotprijzen.
- Registratie en login, scrypt-wachtwoorden, server-side sessies en rollencontrole per API-record.
- Studentintakes en bedrijfsprofielen; nieuwe werkpakketten met budget en begeleider.
- Beoordeling door Stuard en handmatige matching met motivatie.
- Afzonderlijk akkoord van student en bedrijf; opstartchecklist met werkpakket en leerdoelen.
- Trajecten met status, planning, leerdoelen, urenregistratie en beoordeling door het eigen bedrijf.
- Feedback, opvolgmomenten en vertrouwelijke meldingen aan Stuard.
- Pauzeren, hervatten, verlengen, afronden en stoppen met toelichting.
- Portfolio met versiegebonden goedkeuring en een downloadbaar tekstbestand, ook na afronding. Bewerken trekt de goedkeuring in. Geen publieke portfolio’s.
- Dienstverleningsvoorstellen en externe factuurreferenties, met bescherming tegen dubbele maand- en opstartregels.
- Pilotprijzen voor nieuwe trajecten; bestaande prijsafspraken veranderen niet achteraf.
- Responsieve desktop- en mobiele schermen, lege toestanden, foutmeldingen en toetsenbordbediening.

Het bedrijf blijft werkgever en betaalt het loon. Stuard-dienstverlening staat daar los van. Het facturatieoverzicht verstuurt geen officiële facturen, verwerkt geen betalingen en is geen loonadministratie.

## Techniek en structuur

```text
src/main.tsx          Interface, routes, formulieren en rolafhankelijke schermen
src/styles.css       Responsieve huisstijl en toegankelijkheidsstijlen
server/app.js        API, validatie, sessies en autorisatie
server/db.js         Schema, transacties, wachtwoordfuncties en demo-fixtures
server/index.js      Serverstart en scheiding tussen demo- en echte databases
server/admin.js      Beheerder aanmaken buiten publieke registratie
tests/api.test.js    Regels, rechten, persistence en integratietests
tests/browser/       Echte Chromium-flows met drie rollen en mobiele checks
docs/PROJECTPLAN.md   Productkeuzes en implementatieplan
```

React, TypeScript, Vite, Express, Zod en SQLite (ingebouwde Node-driver). De database wordt bij de eerste start aangemaakt; `PRAGMA user_version=1` beschrijft het initiële schema. Een toekomstige schemawijziging vraagt een expliciete migratie. Het huidige ontwerp is voor één serverproces met beperkte pilotbelasting, niet voor meerdere replicas.

## Controles

```bash
npm run build          # TypeScript en productie-assets
npm test               # 13 API-/integratietests
npm run test:e2e        # Chromium, volledige pilotflow, mobiel en toegankelijkheid
npm run format:check   # Broncodeopmaak
```

Browsertests gebruiken een eigen tijdelijke database en een server op poort 3101; ze veranderen je demo niet. Chromium staat in deze cloudomgeving op `/usr/bin/chromium`. Stel elders `CHROMIUM_PATH` in op de executable. Tests controleren echte downloads, versiecontrole, rechten, intakes en de gezamenlijke start. Automatische toegankelijkheidstests zijn geen volledige WCAG-audit.

Screenshots van de laatste browserrun staan lokaal in `.data/screens/`. Testresultaten en traces staan bij falen in `test-results/`.

## Een omgeving met echte accounts voorbereiden

Gebruik een nieuwe database buiten de demo en zet `DEMO_MODE` uit. Start alleen achter HTTPS met veilige proxyconfiguratie. In productie gebruikt de app Secure-cookies; inloggen via gewone HTTP hoort daar niet te werken.

```bash
npm ci
npm run build
# Injecteer DATABASE_PATH, ADMIN_NAME, ADMIN_EMAIL en ADMIN_PASSWORD veilig.
# Gebruik hetzelfde DATABASE_PATH bij beide commando's.
npm run admin
npm start
```

Het beheerscript vereist een wachtwoord van minstens 12 tekens. Het print geen wachtwoorden en wijzigt geen bestaande accounts. Geef secrets via procesomgeving of de gekozen secret manager door, niet via Git of chat. Zet `ADMIN_PASSWORD` na het bootstrapcommando niet onnodig op de applicatieserver.

Gebruik de Node-server voor de gebouwde app; hij serveert zowel de API als `dist/`. `PORT` is standaard 3001. Een reverse proxy moet de oorspronkelijke host behouden, omdat de API cross-origin mutaties weigert. Alleen de API-poort hoort bereikbaar te zijn via die proxy; een Vite-ontwikkelserver is geen productieserver.

## Bewuste grenzen vóór een echte lancering

- E-mailverificatie, wachtwoordherstel, MFA, uitnodigingen en meerdere begeleiders per bedrijf zijn nog niet geïmplementeerd. De huidige pilot heeft één bedrijfsaccount per bedrijf.
- Geen notificatiemails, agenda-integratie, uploads, object storage of automatische herinneringen. Opvolgmomenten zijn zichtbaar in de app.
- Geen boekhoud-/Peppol-koppeling of automatische btw-bepaling. Externe facturatie moet apart worden ingericht. Volledig gepauzeerde maanden zonder dienstverlening mogen niet als geleverd worden bevestigd.
- Geen automatische controle van arbeidscontracten, studentenstatuut of wettelijke uurquota. De werkgever controleert die buiten de app.
- De verlengingsflow registreert de bevestiging door Stuard dat beide partijen akkoord zijn; zij tekenen daarbij geen digitaal contract in de app.
- Bevestigde portfolio-export is een tekstbestand; geen PDF, bestandsbijlagen of openbaar deelbare link. Bedrijfsgoedkeuring is geen vakcertificering.
- Juridische teksten, privacygrondslagen, bewaartermijnen en een proces voor inzage/verwijdering moeten vóór echte werving worden vastgesteld. De pilot verzamelt alleen noodzakelijke intakegegevens maar biedt nog geen volledige AVG-verzoekworkflow.
- Back-ups, herstel, monitoring, e-mailvoorziening en hosting zijn niet uitgerold. Maak consistente SQLite-back-ups via de backup-API (geen losse kopie van alleen de database tijdens WAL-writes) en test herstel vóór productie.
- De huisstijl verwijst naar het aangeleverde beeld. De app gebruikt een typografisch woordmerk; het exacte geüploade logo is niet als bronbestand verwerkt.

De werking is lokaal getest. Hosting en gebruik met echte deelnemers zijn een afzonderlijke opleverstap. Voor de online demo via Render: zie [docs/DEMO-GEBRUIKEN.md](docs/DEMO-GEBRUIKEN.md). De Render-configuratie publiceert niets totdat je zelf de service aanmaakt.
