# Stuard — product- en bouwplan

Datum: 16 oktober 2026. Bron: het aangeleverde Stuard-businessplan. De gebruiker kiest een volledige pilot met drie rollen en trajectbeheer en geeft opdracht na deze planning direct te bouwen.

## 1. Doel en afbakening

Een Nederlandstalige, responsieve webapp voor betaalde praktijkervaring bij kleine bedrijven. De eerste versie ondersteunt de volledige pilot: aanmelden, intake beoordelen, handmatig matchen, gezamenlijk starten, begeleiden, uren opvolgen en een goedgekeurde portfolio-case exporteren.

De pilot richt zich aanvankelijk op Gent, marketing/communicatie en sales/klantenopvolging. Het businessplan stelt handmatige dienstverlening voor; de app organiseert dat werk zonder automatisch over aanwerving te beslissen. Het bedrijf blijft werkgever en betaalt studenten rechtstreeks. Stuard rekent alleen dienstverlening aan het bedrijf aan.

Instelbare uitgangspunten: acht weken, doorgaans 4–8 uur per week, €350 opstart en €195 per actieve maand exclusief btw. Deze bedragen zijn pilotprijzen, geen gevalideerde marktprijzen. Vier maanden is een financiële aanname en geen verplichte looptijd.

## 2. Rollen en bevoegdheden

| Rol                | Mogelijkheden                                                                                                                                                                | Grenzen                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Student            | Eigen profiel/intake, beschikbaarheid, voorgestelde matches beantwoorden, eigen trajecten, uren indienen, feedback lezen, portfolio schrijven en exporteren, probleem melden | Geen andere studenten of interne Stuard-notities; geen zelfgoedkeuring van uren of portfolio |
| Bedrijf/begeleider | Eigen bedrijf/intake en opdrachten, expliciet voorgestelde profielen, matches beantwoorden, eigen trajecten, uren beoordelen, feedback geven, portfolio-versie goedkeuren    | Geen volledige kandidatenbank of dossiers van andere bedrijven                               |
| Stuard-beheer      | Intake beoordelen, opdrachten beheren, matching met motivatie, opstartchecklist, opvolging, incidenten, prijsafspraken en facturatieoverzicht                                | Geen stilzwijgende instemming namens student of bedrijf; geen salarisadministratie           |

Autorisatie gebeurt op de server per record, niet alleen door knoppen te verbergen. Zelfregistratie maakt uitsluitend student- of bedrijfsaccounts. Beheerders worden alleen buiten de publieke registratie ingericht.

## 3. Gebruikersstromen

1. **Intake:** student vermeldt opleiding, vaardigheden, beschikbaarheid en leerwens; bedrijf vermeldt taken, begeleider, uren en budget. Stuard kwalificeert de aanvraag. Een budgetakkoord is geen arbeidscontract.
2. **Match:** beheer kiest student en opdracht en schrijft een motivatie. Alleen dit bedrijf krijgt het voorgestelde profiel. Student en bedrijf bevestigen afzonderlijk. Afwijzingen blijven zichtbaar voor beheer.
3. **Opstart:** beide bevestigingen, werkpakket, 2–3 leerdoelen, begeleider, prijsafspraken en bevestiging dat werkgever de tewerkstelling regelt, zijn nodig voor activatie. De app bevestigt processtappen, niet de juridische geldigheid van documenten.
4. **Uitvoering:** overzicht van werkzaamheden, uren indienen en goedkeuren, feedback/opvolgmomenten, aandachtspunten, eerste-weekcontact en eindevaluatie. Pauzeren en hervatten hebben eigen gebeurtenissen.
5. **Afronding:** werkgever beoordeelt de concrete portfolio-versie. Aanpassingen maken die goedkeuring ongeldig. De student kan de goedgekeurde eigen case exporteren, ook na afronding. Vertrouwelijke inhoud wordt niet openbaar gepubliceerd.
6. **Verlengen:** verlenging houdt hetzelfde traject en dezelfde start; een nieuwe combinatie wordt een nieuw traject. Stopredenen worden apart geregistreerd.
7. **Dienstverlening:** beheer registreert geleverde actieve maanden en externe factuurreferenties. Geen automatische aanrekening voor een volledig gepauzeerde maand. Een facturatievoorstel is geen officiële factuur.

## 4. Schermen

- Publieke homepage: heldere uitleg, twee doelgroepen, stappen, tarieven en aanmelden/inloggen. Geen verzonnen klantenclaims of partnerlogo’s.
- Dashboard per rol: relevante cijfers, eerstvolgende acties, trajecten en voortgang.
- Studenten: interne kandidatenlijst, intake en beoordeling; student ziet een eigen profielscherm.
- Bedrijven/opdrachten: intake, werkpakket, regio, begeleider en beoordelingsstatus.
- Matches: voorstel, onderbouwing en beide beslissingen.
- Trajecten: lijst en detail met overzicht, leerdoelen, uren, opvolging en portfolio.
- Portfolio: eigen cases, versiecontrole, goedkeuring en export.
- Dienstverlening: voor beheer en betrokken bedrijf een overzicht van bedragen/status en verwijzing naar externe facturatie.
- Instellingen: eigen profiel en voor beheer pilotprijzen.

Alle schermen hebben lege toestanden, laadstatus, foutmeldingen en werkende acties. Navigatie werkt op desktop en mobiel. Nederlands, euro’s en weergave in Europe/Brussels.

## 5. Vormgeving

Het aangeleverde beeld is de visuele referentie: warm ivoor, bijna zwart, rood/oranje en geel. Rustige leesbare typografie, veel witruimte, duidelijke tabellen/kaarten en spaarzame kleuraccenten. Een vaste zijbalk op desktop en compacte navigatie op mobiel. Statussen gebruiken tekst én kleur. Focusringen, labels, toetsenbordbediening en voldoende contrast behoren tot de basis.

Het exacte geüploade logo is in deze sessie alleen als chatbeeld beschikbaar; de eerste implementatie gebruikt een eigen typografisch Stuard-woordmerk en kleuren uit het beeld. Geen claim dat het oorspronkelijke logo-bestand is verwerkt.

## 6. Technische keuzes

- React + TypeScript + Vite voor de webinterface; React Router voor navigatie; Lucide voor consistente pictogrammen.
- Node.js 24 + Express voor de API; Zod voor invoervalidatie.
- SQLite via de ingebouwde Node-driver voor een zelfstandig draaiende pilot zonder externe sleutels. Migraties en seeddata staan apart; databasetoegang loopt uitsluitend via de API. WAL en transacties beschermen gerelateerde mutaties.
- Server-side sessies met willekeurige tokens, gehashte opslag en HttpOnly/SameSite-cookies. Wachtwoorden met scrypt, loginlimiter en controle op cross-origin mutaties. Secure cookies bij HTTPS/productie.
- Node-test-runner/API-tests voor regels en rechten; Playwright met Chromium voor echte browserflows en mobiele controles.
- Eén repository, aparte ontwikkelprocessen voor frontend/API, één Node-server die de gebouwde frontend serveert voor productievalidatie.

Voor een gehoste pilot zijn HTTPS, back-ups, hersteltest en operationeel beheer nodig. SQLite past bij één server en klein volume. Meerdere replicas vereisen een gedeelde database; dat wordt geen verborgen aanname van deze versie.

## 7. Datamodel

Gebruikers en sessies; studentprofielen; bedrijven met eigenaar/begeleider; opdrachten; matches met afzonderlijke instemming; trajecten met start/einddatum en prijsafspraak; leerdoelen; urenregels; opvolgnotities; portfolio-cases met versienummer en versiegebonden goedkeuring; dienstverleningsregels met unieke traject/periodecombinatie; incidentmeldingen; auditgebeurtenissen; pilotinstellingen.

Bedragen worden als gehele eurocenten opgeslagen. Tijden worden eenduidig opgeslagen en lokaal weergegeven. Gegevens van bedrijven en studenten worden via serverfilters beperkt tot de eigen relatie. Kritieke acties leggen actor en tijd vast. Prijswijzigingen veranderen bestaande trajectafspraken niet achteraf.

## 8. Statussen en integriteit

- Intake/opdracht: nieuw → geschikt of uitgesteld, met reden bij uitstel.
- Match: voorgesteld → beide akkoord of afgewezen. Activeren is een aparte beheeractie met checklist.
- Traject: voorbereiding → actief ↔ gepauzeerd → afgerond/gestopt. Afgeronde trajecten kunnen niet stilzwijgend opnieuw worden gestart.
- Uren: ingediend → goedgekeurd/afgewezen, uitsluitend door de bijbehorende begeleider. Uren blijven werkgeversinformatie; geen loonberekening.
- Portfolio: concept → ingediend → goedgekeurd/wijzigingen gevraagd. Een gewijzigde case vereist nieuwe goedkeuring; export gebruikt alleen de goedgekeurde versie.
- Dienstverleningsregel: voorstel → extern gefactureerd → betaald. Unieke sleutel voorkomt dubbele maand-/opstartregels. Geen automatische betaalprovider of incasso.

## 9. Veiligheid en privacy

Geen rijksregisternummers, medische dossiers of loonadministratie opslaan. Profielen niet publiek doorzoekbaar. Interne notities en incidentmeldingen alleen voor bevoegde gebruikers. Portfolio’s standaard privé. Accounttoegang betekent niet automatisch toestemming voor openbare publicatie.

Demogegevens zijn fictief en duidelijk herkenbaar; demo-toegang wordt uitsluitend expliciet in demo-modus aangezet en moet uitstaan voor echte persoonsgegevens. Logs bevatten geen wachtwoorden of sessietokens. Niet vertrouwen op clientrollen of verborgen velden. Bij productie zijn nog nodig: gevalideerde privacyteksten, bewaartermijnen, verzoekprocedure, juridische contracten, MFA/accountherstel, e-mailverificatie en gekozen facturatiesoftware. Die operationele zaken worden niet als voltooid voorgesteld.

## 10. Bouwvolgorde en oplevercriteria

| Fase                          | Werk                                                                            | Controle vóór volgende stap                                                             |
| ----------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1. Fundament                  | Project, database, authenticatie, rollen, demo-fixtures, huisstijl en navigatie | Opstart/build slagen; geen toegang zonder sessie; rolgrenzen getest                     |
| 2. Intake                     | Homepage, registratie, student/bedrijfsprofielen, opdrachten, kwalificatie      | Intake blijft bewaard; ongeldige invoer faalt; andere bedrijven zien niets              |
| 3. Matching                   | Handmatige selectie, onderbouwing, twee akkoordknoppen, opstartchecklist        | Geen start zonder beide akkoorden en vereiste afspraken                                 |
| 4. Traject                    | Detail, leerdoelen, uren, feedback, pauzeren, hervatten, verlengen/afronden     | Student kan uren niet zelf goedkeuren; overgangsregels getest                           |
| 5. Portfolio en administratie | Versiegoedkeuring, export, dienstverlening en instellingen                      | Gewijzigd portfolio blokkeert export; dubbele kostenregels geweigerd                    |
| 6. Validatie                  | API-tests, complete browserflow, mobiel, build, documentatie                    | Gebruiker kan als drie rollen de volledige keten doorlopen; gegevens overleven herstart |

We bouwen in deze volgorde in deze sessie. Er wordt geen kalenderbelofte of productiepublicatie aan gekoppeld. Reële beperkingen worden in de README en oplevering genoemd.

## 11. Belangrijkste acceptatietests

1. Student en bedrijf kunnen registreren en hun intake bewaren.
2. Beheer kan een passende kandidaat voorstellen met motivatie.
3. Niemand kan zonder beide beslissingen een match activeren.
4. Traject start pas na werk-/leerafspraken en werkgeverschecklist.
5. Een student kan alleen eigen uren indienen; alleen de betreffende bedrijfsbegeleider kan deze goedkeuren.
6. Feedback en leerdoelen blijven na herladen bewaard.
7. Een gepauzeerd traject wordt herkenbaar getoond; volledig gepauzeerde maanden worden niet automatisch gefactureerd.
8. Portfolio-export lukt pas na goedkeuring; aanpassen trekt de versiegebonden goedkeuring in.
9. Bedrijf A krijgt via UI én directe API geen gegevens van bedrijf B.
10. Verlenging maakt geen extra start/opstartkosten; dubbele maandregels worden geweigerd.
11. Een klacht kan privé naar Stuard; die verschijnt niet automatisch bij de werkgever.
12. Desktop en mobiel ondersteunen de kernflow met toegankelijke formulieren.

## 12. Later, op basis van pilotervaring

E-mail en agenda-integratie, boekhoudkoppeling met geschikte Belgische e-facturatie, documentopslag met uploadscanning, uitgebreid beheer van meerdere bedrijfsmedewerkers, MFA/SSO, structurele export/verwijderingsprocessen, toegestane openbare portfolio-links en database-hosting. AI-matching, native apps, salarisadministratie, betalingen aan studenten en automatische juridische beoordeling vallen buiten deze pilot.

## 13. Succesmeting

Meet echte starts apart van inschrijvingen, actieve trajecten, tijd tot match, opstart-/opvolguren, redenen voor pauze/stop, goedgekeurde portfolio’s en betalingsstatus. De doelen uit het businessplan (vijf betaalde proeftrajecten, vier bruikbare cases, drie geïnteresseerde verlengers) zijn doelen en worden niet als echte dashboardresultaten ingevuld. Demoresultaten dragen een zichtbaar demolabel.
