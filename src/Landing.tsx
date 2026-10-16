import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  GraduationCap,
  MapPin,
  Menu,
  Megaphone,
  MessageCircle,
  MoveUpRight,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";

type Props = {
  settings?: { region?: string; setup_cents?: number; monthly_cents?: number };
  signedIn: boolean;
};
const price = (cents: number) =>
  new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export default function Landing({ settings, signedIn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [destination, setDestination] = useState("student");
  const navigate = useNavigate();
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="student-site">
      <a className="skip-link" href="#student-main">
        Naar inhoud
      </a>
      <header className="student-header">
        <div className="student-nav">
          <Link
            className="student-wordmark"
            to="/"
            aria-label="Stuard homepage"
          >
            stuard<span>.</span>
          </Link>
          <nav
            className={
              menuOpen ? "student-nav-links is-open" : "student-nav-links"
            }
            aria-label="Hoofdnavigatie"
            id="student-navigation"
          >
            <a href="#voor-studenten" onClick={closeMenu}>
              Voor studenten
            </a>
            <a href="#werkgebieden" onClick={closeMenu}>
              Werkgebieden
            </a>
            <a href="#zo-werkt-het" onClick={closeMenu}>
              Zo werkt het
            </a>
          </nav>
          <div className="student-nav-actions">
            <a className="student-employer-link" href="#voor-bedrijven">
              Voor bedrijven <ArrowUpRight size={14} />
            </a>
            <Link
              className="student-login-link"
              to={signedIn ? "/app" : "/login"}
            >
              {signedIn ? "Mijn werkplek" : "Inloggen"}
            </Link>
            <button
              className="student-menu-toggle"
              aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
              aria-expanded={menuOpen}
              aria-controls="student-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="student-main">
        <section className="student-hero" id="voor-studenten">
          <div className="student-hero-inner">
            <div className="student-hero-copy">
              <div className="student-hello">
                <span className="hello-stroke" /> HELLO, PRAKTIJK.
              </div>
              <h1>
                Werk dat je
                <br />
                <span>verder brengt.</span>
              </h1>
              <p>
                Jouw talent verdient een echte kans. Doe betaald ervaring op bij
                een klein bedrijf, met iemand die je verder helpt.
              </p>
              <form
                className="student-route-picker"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(
                    destination === "workplace"
                      ? signedIn
                        ? "/app"
                        : "/login"
                      : `/register?role=${destination}`,
                  );
                }}
              >
                <label htmlFor="student-goal">
                  Waar begint jouw volgende stap?
                </label>
                <div className="student-picker-row">
                  <div className="student-select-wrap">
                    <select
                      id="student-goal"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      <option value="student">
                        Ik wil praktijkervaring opdoen
                      </option>
                      <option value="company">
                        Ik zoek talent voor mijn bedrijf
                      </option>
                      <option value="workplace">
                        Ik wil naar mijn werkplek
                      </option>
                    </select>
                    <ChevronDown size={17} />
                  </div>
                  <button type="submit" aria-label="Ga naar je volgende stap">
                    <ArrowUpRight size={25} />
                  </button>
                </div>
              </form>
              <div className="student-hero-caption">
                <MapPin size={15} />
                {settings?.region || "Gent"} <span /> Gratis voor studenten{" "}
                <span /> Betaald werk
              </div>
            </div>
            <div className="student-hero-visual">
              <div className="student-photo-orbit" aria-hidden="true" />
              <img
                className="student-hero-photo"
                src="/images/stuard-students.webp"
                alt="Drie jonge volwassenen die samen enthousiast vooruitkijken"
                fetchPriority="high"
                width="1024"
                height="1024"
              />
              <div
                className="student-sticker student-sticker-top"
                aria-hidden="true"
              >
                <Zap size={38} strokeWidth={2.5} />
              </div>
              <div
                className="student-sticker student-sticker-bottom"
                aria-hidden="true"
              >
                <BriefcaseBusiness size={31} strokeWidth={2.3} />
              </div>
              <div className="student-photo-label">
                <span>LEER. DOE. GROEI.</span>
                <MoveUpRight size={28} />
              </div>
            </div>
          </div>
        </section>
        <div
          className="student-ticker"
          role="region"
          aria-label="Echte ervaring. Eerlijk betaald. Samen groeien."
        >
          <div aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                ECHTE ERVARING <Zap /> EERLIJK BETAALD <Sparkles /> SAMEN
                GROEIEN <ArrowUpRight />
              </span>
            ))}
          </div>
        </div>
        <section
          className="student-facts student-container"
          aria-label="Het Stuard-pilotaanbod"
        >
          {[
            {
              icon: GraduationCap,
              value: "€0",
              text: "Deelname voor studenten",
            },
            {
              icon: BriefcaseBusiness,
              value: "2",
              text: "Werkgebieden om te ontdekken",
            },
            { icon: Zap, value: "8 weken", text: "Je eerste praktijktraject" },
            {
              icon: MessageCircle,
              value: "Persoonlijk",
              text: "Begeleiding van begin tot einde",
            },
          ].map((f) => (
            <div className="student-fact" key={f.text}>
              <span>
                <f.icon size={28} strokeWidth={2} />
              </span>
              <div>
                <strong>{f.value}</strong>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </section>
        <section className="student-fields student-container" id="werkgebieden">
          <div className="student-section-heading">
            <span className="student-kicker">
              <span /> JOUW TALENT, JOUW RICHTING
            </span>
            <h2>
              Wat wil jij
              <br />
              <span>in de praktijk brengen?</span>
            </h2>
            <p>
              Begin met wat je interesseert. Wij zoeken samen met jou naar werk
              dat bij je past.
            </p>
          </div>
          <div className="student-field-grid">
            <article className="student-field-card student-field-lilac">
              <div className="student-card-top">
                <span className="student-mini-label">
                  VOOR CREATIEVE DENKERS
                </span>
                <Megaphone size={40} strokeWidth={1.8} />
              </div>
              <h3>
                Maak ideeën
                <br />
                zichtbaar.
              </h3>
              <p className="student-field-name">Marketing & communicatie</p>
              <p>
                Van een sterke tekst tot een frisse contentkalender. Werk aan
                echte communicatie en ontdek wat jouw ideeën kunnen doen.
              </p>
              <div className="student-tag-list">
                <span>Content</span>
                <span>Social media</span>
                <span>Copywriting</span>
              </div>
              <Link to="/register?role=student" className="student-card-action">
                Dit past bij mij{" "}
                <span>
                  <ArrowUpRight size={23} />
                </span>
              </Link>
            </article>
            <article className="student-field-card student-field-yellow">
              <div className="student-card-top">
                <span className="student-mini-label">
                  VOOR ECHTE VERBINDERS
                </span>
                <MessageCircle size={40} strokeWidth={1.8} />
              </div>
              <h3>
                Maak contact.
                <br />
                Maak verschil.
              </h3>
              <p className="student-field-name">Sales & klantenopvolging</p>
              <p>
                Leer een klantvraag begrijpen, houd overzicht en help een
                bedrijf om relaties beter op te volgen. Altijd met begeleiding.
              </p>
              <div className="student-tag-list">
                <span>Klantencontact</span>
                <span>CRM</span>
                <span>Opvolging</span>
              </div>
              <Link to="/register?role=student" className="student-card-action">
                Dit past bij mij{" "}
                <span>
                  <ArrowUpRight size={23} />
                </span>
              </Link>
            </article>
          </div>
        </section>
        <section className="student-how" id="zo-werkt-het">
          <div className="student-container">
            <div className="student-section-heading">
              <span className="student-kicker">
                <span /> VAN EERSTE HALLO TOT ECHTE GROEI
              </span>
              <h2>
                Niet alleen een match.
                <br />
                <span>Een volgende stap.</span>
              </h2>
            </div>
            <div className="student-step-grid">
              {[
                {
                  number: "01",
                  icon: MessageCircle,
                  title: "Vertel jouw verhaal.",
                  body: "Wat kun je al? Wat wil je leren? We beginnen met een persoonlijke intake, zonder dat je al een indrukwekkend cv nodig hebt.",
                },
                {
                  number: "02",
                  icon: Target,
                  title: "Vind jouw plek.",
                  body: "We stellen een passende samenwerking voor. Jij en het bedrijf kiezen allebei of jullie samen willen starten.",
                },
                {
                  number: "03",
                  icon: Sparkles,
                  title: "Maak groei zichtbaar.",
                  body: "Je werkt betaald mee, krijgt feedback en bouwt aan een portfolio dat laat zien wat jij hebt bijgedragen.",
                },
              ].map((s) => (
                <article key={s.number} className="student-step">
                  <div>
                    <span>{s.number}</span>
                    <s.icon size={25} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </article>
              ))}
            </div>
            <Link
              className="student-pill student-pill-dark"
              to="/register?role=student"
            >
              Klaar voor jouw eerste stap? <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
        <section
          className="student-employers student-container"
          id="voor-bedrijven"
        >
          <div className="student-employer-copy">
            <span className="student-kicker">
              <span /> KLEIN BEDRIJF. GROOT POTENTIEEL.
            </span>
            <h2>
              Een frisse blik
              <br />
              voor jouw bedrijf.
            </h2>
            <p>
              Die taken die blijven liggen? Geef ze een plek. Stuard brengt je
              samen met een student die wil bijleren, met heldere afspraken en
              persoonlijke opvolging.
            </p>
            <ul>
              {[
                "Een concreet en haalbaar werkpakket",
                "Persoonlijke selectie en gezamenlijke opstart",
                "Opvolging, feedback en een portfolio-case",
              ].map((v) => (
                <li key={v}>
                  <Check size={18} />
                  {v}
                </li>
              ))}
            </ul>
            <Link
              className="student-pill student-pill-dark"
              to="/register?role=company"
            >
              Vertel ons over je bedrijf <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="student-price-card">
            <span className="student-price-sticker">HET PILOTAANBOD</span>
            <BriefcaseBusiness size={36} />
            <h3>
              Helder vanaf
              <br />
              het begin.
            </h3>
            <div className="student-price-row">
              <strong>{price(settings?.setup_cents ?? 35000)}</strong>
              <span>eenmalige opstart</span>
            </div>
            <div className="student-price-row">
              <strong>{price(settings?.monthly_cents ?? 19500)}</strong>
              <span>per actieve maand</span>
            </div>
            <p>
              Exclusief btw. Loon en werkgeverskosten komen daar apart bij. Het
              bedrijf neemt de student rechtstreeks in dienst. Deze pilotprijzen
              worden geëvalueerd.
            </p>
            <div className="student-price-note">
              <GraduationCap size={20} /> Voor studenten altijd gratis.
            </div>
          </div>
        </section>
        <section className="student-final-banner">
          <div className="student-container">
            <div>
              <span>JE HOEFT NOG NIET ALLES TE KUNNEN.</span>
              <h2>
                Je moet ergens
                <br />
                <em>beginnen.</em>
              </h2>
            </div>
            <Link
              className="student-pill student-pill-white"
              to="/register?role=student"
            >
              Begin bij Stuard <ArrowUpRight size={23} />
            </Link>
            <span className="student-final-spark" aria-hidden="true">
              ✦
            </span>
          </div>
        </section>
      </main>
      <footer className="student-footer student-container">
        <Link className="student-wordmark" to="/">
          stuard<span>.</span>
        </Link>
        <p>
          Betaalde praktijkervaring.
          <br />
          Een volgende stap die bij je past.
        </p>
        <div>
          <a href="#voor-bedrijven">Voor bedrijven</a>
          <Link to="/login">
            Naar de werkplek <ArrowRight size={15} />
          </Link>
        </div>
        <span>Gemaakt om samen te groeien.</span>
      </footer>
    </div>
  );
}
