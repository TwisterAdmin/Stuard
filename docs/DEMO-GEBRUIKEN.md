# De Stuard-demo openen

De server in de Codex-cloudomgeving is niet automatisch bereikbaar vanuit je eigen browser. Een cloudomgeving publiceren is ook geen website publiceren. Een screenshot of een pad onder `/workspace` is geen online demo-adres.

## Online demo via Render

`render.yaml` bevat een startconfiguratie voor een afzonderlijke demo:

- De gebouwde interface en API draaien samen op één service.
- Er zijn geen externe API-sleutels of wachtwoorden nodig voor de demoaccounts.
- Cookies gebruiken HTTPS. De demo is nadrukkelijk gescheiden van productie.
- De demo bevat fictieve gegevens en heeft direct toegankelijke rollen **Beheer**, **Student** en **Bedrijf** op de loginpagina.
- Bezoekers delen dezelfde demo. Vul geen echte persoonsgegevens of vertrouwelijke bedrijfsinformatie in.
- De configuratie kiest een gratis service zonder permanente schijf. Wijzigingen verdwijnen bij een herstart of nieuwe deployment. Een slapende service kan bij het eerste bezoek even moeten opstarten. Controleer de actuele voorwaarden bij Render voordat je de service aanmaakt.

Nog nodig om een klikbaar adres te krijgen:

1. Gebruik de branch `main` van `TwisterAdmin/Stuard` op GitHub. Die bevat de app en `render.yaml` zodra de voorbereide broncode is gepusht.
2. Koppel die repository aan je eigen Render-account en maak een Blueprint aan met `render.yaml`.
3. Controleer de gekozen service en het tarief en start de deployment.
4. Gebruik het HTTPS-adres dat Render na de deployment toont. Open **Inloggen** en kies een demorol. Er is geen wachtwoord nodig voor die rollen.

Deze stappen zijn instructies; er is nog geen Render-service aangemaakt en geen online adres geverifieerd. Deel geen toegangssleutels in chat. Koppel een account via de ondersteunde accountinstellingen of beheer de service zelf in Render.

## Demo op je eigen computer

Dit kan zodra je de app-bestanden hebt gedownload of de code in GitHub staat. Gebruik Node.js 24 of hoger.

Open een terminal in de map met `package.json`:

```bash
npm ci
npm run demo
```

Laat de terminal open. Open het lokale adres dat Vite in jouw eigen terminal toont. Kies **Inloggen** en daarna **Beheer**, **Student** of **Bedrijf**. De gegevens worden op je eigen computer in `.data/demo.sqlite` bewaard.

Je kunt ook de gebouwde versie met één server gebruiken:

```bash
npm ci
npm run build
npm run demo:built
```

Deze versie gebruikt lokaal poort 3001. Gebruik `COOKIE_SECURE=true` uitsluitend als je de demo via HTTPS aanbiedt; op gewone lokale HTTP werkt een Secure-cookie niet.
