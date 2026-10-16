import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Users,
  Building2,
  GitMerge,
  BriefcaseBusiness,
  FolderHeart,
  ReceiptText,
  Settings,
  LogOut,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Clock3,
  Check,
  X,
  Menu,
  Sparkles,
  GraduationCap,
  CircleHelp,
  CheckCircle2,
  Target,
  Download,
  Send,
  Pause,
  Play,
  AlertCircle,
  MapPin,
  Pencil,
  ShieldCheck,
  FileText,
  HeartHandshake,
} from "lucide-react";
import "./styles.css";

type Row = Record<string, any>;
type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "student" | "company";
};
const roleNames = {
  admin: "Stuard-beheer",
  student: "Student",
  company: "Bedrijfsbegeleider",
};
const labels: Record<string, string> = {
  active: "Actief",
  paused: "Gepauzeerd",
  completed: "Afgerond",
  stopped: "Gestopt",
  new: "Nieuwe intake",
  qualified: "Geschikt",
  deferred: "Uitgesteld",
  pending: "In afwachting",
  accepted: "Akkoord",
  rejected: "Afgewezen",
  submitted: "Ter beoordeling",
  approved: "Goedgekeurd",
  draft: "Concept",
  changes_requested: "Aanpassen",
  invoiced: "Gefactureerd",
  paid: "Betaald",
  open: "Open",
  resolved: "Afgehandeld",
};
const money = (c: number) =>
  new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(c / 100);
const fmtDate = (d: string, full = false) =>
  d
    ? new Date(
        d.length === 10 ? d + "T12:00:00" : d.replace(" ", "T") + "Z",
      ).toLocaleDateString("nl-BE", {
        day: "numeric",
        month: full ? "long" : "short",
        ...(full ? { year: "numeric" as const } : {}),
        timeZone: "Europe/Brussels",
      })
    : "—";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
const initial = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Het verzoek is mislukt.");
  return body;
}
const Session = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  meta: Row;
  refreshMeta: () => void;
}>({ user: null, setUser: () => {}, meta: {}, refreshMeta: () => {} });
const ToastContext = createContext<(text: string) => void>(() => {});
function useData<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    setData(null);
    api<T>(path)
      .then((v) => alive && setData(v))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
function State({ error, children }: { error?: string; children?: ReactNode }) {
  return (
    <div className="state">
      {error ? (
        <>
          <AlertCircle />
          <p>{error}</p>
        </>
      ) : (
        <>
          <span className="loader" />
          <p>{children || "Even ophalen…"}</p>
        </>
      )}
    </div>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + status}>
      <span />
      {labels[status] || status}
    </span>
  );
}
function Avatar({
  name,
  color = "",
  small = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <span className={`avatar ${color} ${small ? "small" : ""}`}>
      {initial(name)}
    </span>
  );
}
function GrowthMark() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="square">
        <path d="M50 7V93M7 50H93M20 20L80 80M20 80L80 20" />
      </g>
    </svg>
  );
}
function Brand() {
  return (
    <Link className="brand" to="/">
      stuard
      <span className="brand-dot" />
    </Link>
  );
}
function Button({
  children,
  onClick,
  kind = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={"button " + kind}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Header({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({
  title = "Hier is het nog rustig",
  text: body = "Zodra er iets klaarstaat, zie je het hier.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <FolderHeart />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: any;
  options?: { value: string | number; label: string }[];
  required?: boolean;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string;
  hint?: string;
};
function Form({
  fields,
  onSubmit,
  submit = "Opslaan",
  children,
}: {
  fields: Field[];
  onSubmit: (data: Row) => Promise<void>;
  submit?: string;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const data: Row = {};
    for (const f of fields)
      data[f.name] =
        f.type === "checkbox"
          ? fd.has(f.name)
          : f.type === "number"
            ? Number(fd.get(f.name))
            : String(fd.get(f.name) || "");
    try {
      await onSubmit(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={send}>
      {fields.map((f) => (
        <label
          className={f.type === "checkbox" ? "checkbox-field" : "field"}
          key={f.name}
        >
          {f.type === "checkbox" ? (
            <>
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={!!f.value}
                required={f.required}
              />
              <span>
                {f.label}
                {f.hint && <small>{f.hint}</small>}
              </span>
            </>
          ) : (
            <>
              <span>
                {f.label}
                {f.required !== false && <span className="required"> *</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  defaultValue={f.value || ""}
                  required={f.required !== false}
                  placeholder={f.placeholder}
                  maxLength={5000}
                  rows={3}
                />
              ) : f.type === "select" ? (
                <select
                  name={f.name}
                  defaultValue={f.value ?? ""}
                  required={f.required !== false}
                >
                  <option value="" disabled>
                    Kies een optie
                  </option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  type={f.type || "text"}
                  defaultValue={f.value ?? ""}
                  required={f.required !== false}
                  placeholder={f.placeholder}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  maxLength={f.type === "password" ? 200 : 5000}
                  minLength={f.type === "password" ? 12 : undefined}
                />
              )}{" "}
              {f.hint && <small>{f.hint}</small>}
            </>
          )}
        </label>
      ))}
      {children}
      {error && (
        <p className="form-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy ? "Even verwerken…" : submit}
          <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <p className="eyebrow">STUARD · SAMEN VOORUIT</p>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Sluiten" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null),
    [meta, setMeta] = useState<Row>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshMeta = () => {
    api("/meta")
      .then(setMeta)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    Promise.all([api("/meta"), api("/me").catch(() => null)])
      .then(([m, u]) => {
        setMeta(m);
        setUser(u);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const notify = (s: string) => {
    setToast(s);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  };
  if (loading || error) return <State error={error} />;
  return (
    <Session.Provider value={{ user, setUser, meta, refreshMeta }}>
      <ToastContext.Provider value={notify}>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/app" replace /> : <Landing />}
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/app" replace /> : <Auth />}
            />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to="/app/profiel" replace />
                ) : (
                  <Auth register />
                )
              }
            />
            <Route
              path="/app"
              element={user ? <Shell /> : <Navigate to="/login" replace />}
            >
              <Route index element={<Dashboard />} />
              <Route
                path="studenten"
                element={
                  <Guard roles={["admin"]}>
                    <Students />
                  </Guard>
                }
              />
              <Route
                path="opdrachten"
                element={
                  <Guard roles={["admin", "company"]}>
                    <Jobs />
                  </Guard>
                }
              />
              <Route path="matches" element={<Matches />} />
              <Route path="trajecten" element={<Placements />} />
              <Route path="trajecten/:id" element={<PlacementDetail />} />
              <Route path="portfolio" element={<Portfolios />} />
              <Route
                path="dienstverlening"
                element={
                  <Guard roles={["admin", "company"]}>
                    <Charges />
                  </Guard>
                }
              />
              <Route path="profiel" element={<Profile />} />
              <Route
                path="instellingen"
                element={
                  <Guard roles={["admin"]}>
                    <SettingsPage />
                  </Guard>
                }
              />
              <Route
                path="*"
                element={
                  <Empty
                    title="Pagina niet gevonden"
                    action={<Link to="/app">Terug naar het overzicht</Link>}
                  />
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={19} />
            {toast}
            <button aria-label="Melding sluiten" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </ToastContext.Provider>
    </Session.Provider>
  );
}
function Guard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useContext(Session);
  return roles.includes(user!.role) ? children : <Navigate to="/app" replace />;
}
import { Outlet } from "react-router-dom";
function Shell() {
  const { user, setUser, meta } = useContext(Session),
    [open, setOpen] = useState(false);
  const location = useLocation(),
    notify = useContext(ToastContext);
  useEffect(() => setOpen(false), [location.pathname]);
  const links = [
    {
      to: "/app",
      icon: LayoutDashboard,
      label: "Overzicht",
      roles: ["admin", "student", "company"],
    },
    { to: "/app/studenten", icon: Users, label: "Studenten", roles: ["admin"] },
    {
      to: "/app/opdrachten",
      icon: Building2,
      label:
        user?.role === "company" ? "Mijn opdrachten" : "Bedrijven & opdrachten",
      roles: ["admin", "company"],
    },
    {
      to: "/app/matches",
      icon: GitMerge,
      label: "Matches",
      roles: ["admin", "student", "company"],
    },
    {
      to: "/app/trajecten",
      icon: BriefcaseBusiness,
      label: "Trajecten",
      roles: ["admin", "student", "company"],
    },
    {
      to: "/app/portfolio",
      icon: FolderHeart,
      label: "Portfolio",
      roles: ["admin", "student", "company"],
    },
    {
      to: "/app/dienstverlening",
      icon: ReceiptText,
      label: "Dienstverlening",
      roles: ["admin", "company"],
    },
  ];
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Naar inhoud
      </a>
      <header className="mobile-bar">
        <Brand />
        <button
          aria-label="Navigatie openen"
          className="icon-button"
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
      </header>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Navigatie sluiten"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Brand />
        <div className="workspace-label">
          <span className="workspace-icon">
            <HeartHandshake size={16} />
          </span>
          <div>
            De werkplek<small>{roleNames[user!.role]}</small>
          </div>
        </div>
        <p className="nav-label">WERK DAT VERBINDT</p>
        <nav>
          {links
            .filter((l) => l.roles.includes(user!.role))
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/app"}
                className={({ isActive }) =>
                  "nav-link " + (isActive ? "active" : "")
                }
              >
                <l.icon size={19} />
                <span>{l.label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-spark">
              <GrowthMark />
            </span>
            <strong>
              Kleine stappen.
              <br />
              Echte vooruitgang.
            </strong>
            <p>Een goed traject begint met aandacht voor elkaar.</p>
            <Link to="/app/trajecten">
              Naar je trajecten <ArrowUpRight size={15} />
            </Link>
          </div>
          <NavLink
            to={user?.role === "admin" ? "/app/instellingen" : "/app/profiel"}
            className="nav-link"
          >
            <Settings size={18} />
            {user?.role === "admin" ? "Instellingen" : "Mijn profiel"}
          </NavLink>
          <div className="user-menu">
            <Avatar name={user!.name} small />
            <div>
              <strong>{user!.name}</strong>
              <small>{roleNames[user!.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Uitloggen"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST", {});
                  setUser(null);
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="topbar">
          <div>
            <span className="breadcrumb">Mijn werkplek</span>
            <ChevronRight size={13} />
            <span>
              {links.find((l) => l.to === location.pathname)?.label ||
                "Traject & profiel"}
            </span>
          </div>
          <div>
            <span className="top-date">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("nl-BE", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Brussels",
              })}
            </span>
            {meta.demo && (
              <span className="demo-tag">DEMO · fictieve gegevens</span>
            )}
          </div>
        </div>
        <main id="main" className="main">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>stuard · Werk dat je verder brengt.</span>
          <span>
            Gemaakt voor echte groei <span className="tiny-dot" />
          </span>
        </footer>
      </div>
    </div>
  );
}

function Landing() {
  const { meta } = useContext(Session);
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand />
        <div>
          <a href="#werkwijze">Zo werkt het</a>
          <a href="#aanbod">Het aanbod</a>
          <Link to="/login">Inloggen</Link>
          <Link className="button" to="/register">
            Doe mee <ArrowUpRight size={17} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="landing-hero">
          <div>
            <p className="eyebrow">
              <span className="tiny-dot" /> VOOR STUDENTEN EN KLEINE BEDRIJVEN
            </p>
            <h1>
              Werk dat je
              <br />
              verder <span>brengt.</span>
            </h1>
            <p>
              Echte ervaring voor jou. Een frisse blik voor je bedrijf. Stuard
              brengt jullie samen voor betaald praktijkwerk, met begeleiding die
              het verschil maakt.
            </p>
            <div className="actions">
              <Link className="button" to="/register?role=student">
                Ik ben student <ArrowUpRight size={17} />
              </Link>
              <Link className="button secondary" to="/register?role=company">
                Ik heb een bedrijf <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="hero-caption">
              <MapPin size={16} /> We beginnen in{" "}
              {meta.settings?.region || "Gent"} <span>•</span> Marketing & sales
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-label">
              EEN FRISSE BLIK.
              <br />
              EEN ECHTE KANS.
            </div>
            <div className="art-circle" />
            <div className="art-red" />
            <div className="art-dark" />
            <div className="art-card">
              <span>Van leren naar doen</span>
              <ArrowUpRight />
              <strong>
                Jouw volgende
                <br />
                stap begint hier.
              </strong>
            </div>
            <span className="art-star">
              <GrowthMark />
            </span>
          </div>
        </section>
        <section className="landing-section" id="werkwijze">
          <p className="eyebrow">ZO WERKT STUARD</p>
          <h2>Een goede match is pas het begin.</h2>
          <div className="three-columns">
            {[
              [
                "01",
                "We leren je kennen",
                "Je talenten, je werk of je ambities. We beginnen met een persoonlijke intake.",
              ],
              [
                "02",
                "We verbinden",
                "Een helder werkpakket en een passende student. Jullie kiezen allebei of het klopt.",
              ],
              [
                "03",
                "We groeien samen",
                "Acht weken betaald meewerken, concrete feedback en een portfolio om op verder te bouwen.",
              ],
            ].map(([n, title, body]) => (
              <article className="step-card" key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="pricing-block" id="aanbod">
          <div>
            <p className="eyebrow">DUIDELIJK VANAF HET BEGIN</p>
            <h2>
              Voor studenten gratis.
              <br />
              Voor bedrijven helder.
            </h2>
            <p>
              De student komt rechtstreeks in dienst bij het bedrijf. Stuard
              verzorgt selectie en opvolging. Loon en werkgeverskosten staan los
              van onze dienstverlening.
            </p>
          </div>
          <div className="price-card">
            <span>PILOTAANBOD</span>
            <h3>
              {money(meta.settings?.setup_cents ?? 35000)}{" "}
              <small>opstart</small>
            </h3>
            <h3>
              {money(meta.settings?.monthly_cents ?? 19500)}{" "}
              <small>/ actieve maand</small>
            </h3>
            <p>
              Exclusief btw en loonkosten. Prijzen worden tijdens de pilot
              geëvalueerd.
            </p>
            <Link to="/register?role=company" className="text-link">
              Vertel ons over je bedrijf <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>Betaalde praktijkervaring. Menselijke begeleiding.</p>
        <Link to="/login">
          Naar de werkplek <ArrowUpRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
function Auth({ register = false }: { register?: boolean }) {
  const { setUser, meta } = useContext(Session),
    notify = useContext(ToastContext);
  const navigate = useNavigate(),
    location = useLocation();
  const [role, setRole] = useState(
      new URLSearchParams(location.search).get("role") === "company"
        ? "company"
        : "student",
    ),
    [busy, setBusy] = useState(false);
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">HIER BEGINT VOORUITGANG</p>
          <h1>
            Groeien doe
            <br />
            je samen<span>.</span>
          </h1>
          <p>Een plek voor je talent, je ambities en je volgende stap.</p>
          <div className="auth-motif" aria-hidden="true">
            <GrowthMark />
          </div>
        </div>
        <small>Stuard · Betaalde praktijkervaring in Gent</small>
      </div>
      <div className="auth-panel">
        <Link className="back-link" to="/">
          <ChevronLeft size={16} /> Terug naar Stuard
        </Link>
        <div className="auth-content">
          <p className="eyebrow">WELKOM BIJ STUARD</p>
          <h1>{register ? "Maak de eerste stap." : "Fijn dat je er bent."}</h1>
          <p className="muted">
            {register
              ? "Vertel ons wie je bent. Je intake vul je hierna verder aan."
              : "Log in en ga verder waar je gebleven was."}
          </p>
          {register && (
            <div className="segmented">
              <button
                className={role === "student" ? "selected" : ""}
                onClick={() => setRole("student")}
              >
                <GraduationCap size={17} /> Student
              </button>
              <button
                className={role === "company" ? "selected" : ""}
                onClick={() => setRole("company")}
              >
                <Building2 size={17} /> Bedrijf
              </button>
            </div>
          )}
          <Form
            key={register + role}
            fields={[
              ...(register
                ? [
                    { name: "name", label: "Je naam" },
                    ...(role === "company"
                      ? [{ name: "company_name", label: "Bedrijfsnaam" }]
                      : []),
                  ]
                : []),
              { name: "email", label: "E-mailadres", type: "email" },
              {
                name: "password",
                label: "Wachtwoord",
                type: "password",
                hint: register
                  ? "Minstens 12 tekens. Gebruik een uniek wachtwoord."
                  : undefined,
              },
            ]}
            submit={register ? "Account aanmaken" : "Inloggen"}
            onSubmit={async (data) => {
              const u = await api(
                "/auth/" + (register ? "register" : "login"),
                "POST",
                { ...data, role },
              );
              setUser(u);
              navigate(register ? "/app/profiel" : "/app");
            }}
          />
          {register ? (
            <p className="auth-switch">
              Al een account? <Link to="/login">Log in</Link>
            </p>
          ) : (
            <p className="auth-switch">
              Nieuw bij Stuard? <Link to="/register">Maak een account</Link>
            </p>
          )}
          {meta.demo && (
            <div className="demo-box">
              <span className="eyebrow">ONTDEK DE PILOT</span>
              <p>Probeer een rol met fictieve gegevens.</p>
              <div>
                {(["admin", "student", "company"] as const).map((r) => (
                  <button
                    key={r}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const u = await api("/auth/demo", "POST", { role: r });
                        setUser(u);
                        navigate("/app");
                      } catch (e) {
                        notify((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {r === "admin"
                      ? "Beheer"
                      : r === "student"
                        ? "Student"
                        : "Bedrijf"}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useContext(Session),
    { data, error, reload } = useData("/dashboard"),
    notify = useContext(ToastContext);
  if (!data) return <State error={error} />;
  const admin = user!.role === "admin";
  const next = data.upcoming
    .filter((n: Row) => n.due_date >= today())
    .slice(0, 3);
  const stats = [
    {
      label: "Actieve trajecten",
      value: data.stats.active,
      icon: BriefcaseBusiness,
      note: "Samen aan het werk",
      color: "yellow",
    },
    {
      label: "Openstaande matches",
      value: data.stats.pending,
      icon: GitMerge,
      note: "Klaar voor een volgende stap",
      color: "red",
    },
    {
      label: "Goedgekeurde uren",
      value: data.stats.hours,
      icon: Clock3,
      note: "Geregistreerde praktijkervaring",
      color: "blue",
    },
    {
      label: "Goedgekeurde cases",
      value: data.stats.portfolios,
      icon: FolderHeart,
      note: "Ervaring om mee te nemen",
      color: "green",
    },
  ];
  return (
    <>
      <Header
        eyebrow="JOUW WERKPLEK"
        title={`Dag ${user!.name.split(" ")[0]},`}
        subtitle={
          admin
            ? "Een frisse blik op alles wat groeit bij Stuard."
            : "Een nieuwe stap in jouw praktijkervaring."
        }
        action={
          <Link
            className="button"
            to={
              admin
                ? "/app/matches"
                : user!.role === "company"
                  ? "/app/opdrachten"
                  : "/app/profiel"
            }
          >
            <Plus size={17} />
            {admin
              ? "Match maken"
              : user!.role === "company"
                ? "Opdracht toevoegen"
                : "Mijn profiel"}
          </Link>
        }
      />
      <section className="welcome-banner">
        <div>
          <p className="eyebrow">TALENT ONTMOET PRAKTIJK</p>
          <h2>
            Kleine stappen.
            <br />
            Grote mogelijkheden.
          </h2>
          <p>
            {data.stats.active > 0
              ? `Er ${data.stats.active === 1 ? "is" : "zijn"} ${data.stats.active} ${data.stats.active === 1 ? "traject" : "trajecten"} onderweg. Geef groei de aandacht die het verdient.`
              : "Een eerste intake is het begin van iets moois."}
          </p>
          <Link to="/app/trajecten">
            Bekijk de trajecten <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="banner-orbit" />
          <span className="banner-asterisk">
            <GrowthMark />
          </span>
          <div className="banner-tag">
            <span className="tiny-dot" /> RUIMTE OM TE GROEIEN
          </div>
          <div className="banner-block" />
        </div>
      </section>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div>
              <span>{s.label}</span>
              <span className={"stat-icon " + s.color}>
                <s.icon size={18} />
              </span>
            </div>
            <strong>
              {s.value}
              <span>{s.label.includes("uren") ? "u" : ""}</span>
            </strong>
            <small>{s.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>
                Trajecten in beweging{" "}
                <span className="count">{data.placements.length}</span>
              </h2>
              <p>Een overzicht van jullie samenwerking.</p>
            </div>
            <Link className="text-link" to="/app/trajecten">
              Alles bekijken <ArrowUpRight size={15} />
            </Link>
          </div>
          {data.placements.length ? (
            <div className="placement-list">
              {data.placements.slice(0, 4).map((p: Row) => (
                <PlacementCard key={p.id} p={p} compact />
              ))}
            </div>
          ) : (
            <Empty
              title="Jouw eerste traject begint met een match"
              text="Vul je intake aan en bespreek de volgende stap met Stuard."
            />
          )}
          <div className="panel-foot">
            <span className="tiny-dot" /> Persoonlijke begeleiding, van start
            tot portfolio.
          </div>
        </section>
        <section className="panel agenda">
          <div className="section-head">
            <div>
              <h2>Op de planning</h2>
              <p>Tijd om even in te checken.</p>
            </div>
            <CalendarDays size={19} />
          </div>
          {next.length ? (
            next.map((n: Row) => (
              <Link
                to={"/app/trajecten/" + n.placement_id}
                className="agenda-item"
                key={n.id}
              >
                <div className="calendar-tile">
                  <strong>{n.due_date.slice(8)}</strong>
                  <span>
                    {new Date(n.due_date + "T12:00:00").toLocaleDateString(
                      "nl-BE",
                      { month: "short" },
                    )}
                  </span>
                </div>
                <div>
                  <strong>{n.body}</strong>
                  <span>
                    {
                      data.placements.find((p: Row) => p.id === n.placement_id)
                        ?.student_name
                    }
                  </span>
                  <small>
                    Opvolgmoment <ArrowUpRight size={12} />
                  </small>
                </div>
              </Link>
            ))
          ) : (
            <Empty
              title="Even ademruimte"
              text="Er staan geen nieuwe opvolgmomenten gepland."
            />
          )}
          <div className="note-card">
            <Sparkles size={18} />
            <div>
              <strong>Een goede vraag maakt verschil.</strong>
              <p>
                Wat heb je deze week geleerd dat je volgende week anders gaat
                doen?
              </p>
            </div>
          </div>
        </section>
      </div>
      <div className="dashboard-columns lower">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>De volgende verbinding</h2>
              <p>Een voorstel dat aandacht verdient.</p>
            </div>
            <GitMerge size={19} />
          </div>
          {data.matches
            .filter(
              (m: Row) =>
                m.student_decision === "pending" ||
                m.company_decision === "pending",
            )
            .slice(0, 2)
            .map((m: Row) => (
              <div className="match-preview" key={m.id}>
                <Avatar name={m.student_name} color="lavender" />
                <div>
                  <strong>
                    {m.student_name} <span className="muted">×</span>{" "}
                    {m.company_name}
                  </strong>
                  <p>{m.title}</p>
                </div>
                <Link
                  className="icon-button"
                  to="/app/matches"
                  aria-label="Match bekijken"
                >
                  <ArrowUpRight size={20} />
                </Link>
              </div>
            ))}
          {!data.stats.pending && (
            <Empty
              title="Alle voorstellen opgevolgd"
              text="Nieuwe voorstellen verschijnen hier."
            />
          )}
        </section>
        <section className="quote-panel">
          <span>“</span>
          <h3>
            Ervaring krijg je.
            <br />
            Groei maak je samen.
          </h3>
          <p>Dat is waar we het voor doen.</p>
          <div>
            HET IDEE ACHTER STUARD <ArrowUpRight size={19} />
          </div>
        </section>
      </div>
      {admin && data.incidents.length > 0 && (
        <section className="panel incidents">
          <div className="section-head">
            <div>
              <h2>Vertrouwelijke meldingen</h2>
              <p>Alleen zichtbaar voor Stuard-beheer.</p>
            </div>
            <ShieldCheck />
          </div>
          {data.incidents.map((i: Row) => (
            <div className="incident-row" key={i.id}>
              <div>
                <strong>{i.author}</strong>
                <p>{i.body}</p>
                <Badge status={i.status} />
              </div>
              {i.status === "open" && (
                <Button
                  kind="secondary"
                  onClick={async () => {
                    try {
                      await api("/incidents/" + i.id, "PATCH", {
                        status: "resolved",
                      });
                      reload();
                      notify("Melding afgehandeld.");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Afhandelen
                </Button>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function PlacementCard({ p, compact = false }: { p: Row; compact?: boolean }) {
  const done = p.goals?.filter((g: Row) => g.done).length || 0,
    total = p.goals?.length || 0;
  return (
    <Link
      className={"placement-card " + (compact ? "compact" : "")}
      to={"/app/trajecten/" + p.id}
    >
      <div className="placement-card-top">
        <div className="person">
          <Avatar
            name={p.student_name}
            color={p.id % 2 ? "peach" : "lavender"}
          />
          <div>
            <strong>{p.student_name}</strong>
            <span>{p.company_name}</span>
          </div>
        </div>
        <Badge status={p.status} />
      </div>
      <h3>{p.title}</h3>
      <div className="card-details">
        <span>
          <Clock3 size={14} />
          {p.weekly_hours} uur / week
        </span>
        <span>
          <CalendarDays size={14} />
          {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
        </span>
      </div>
      <div className="goal-progress">
        <div>
          <span>Leerdoelen</span>
          <strong>
            {done} van {total}
          </strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="placement-card-bottom">
        <span>{p.field}</span>
        <ArrowUpRight size={18} />
      </div>
    </Link>
  );
}

function Students() {
  const { data, error, reload } = useData<Row[]>("/students"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Row | null>(null),
    notify = useContext(ToastContext);
  if (!data) return <State error={error} />;
  const filtered = data.filter((s) =>
    (s.name + " " + s.education + " " + s.skills)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Header
        eyebrow="MENSEN MET MOGELIJKHEDEN"
        title="Studenten"
        subtitle="Leer het talent achter elk profiel kennen."
      />
      <div className="list-toolbar">
        <div className="filter-label">
          Alle studenten <span className="count">{data.length}</span>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Studenten zoeken"
            placeholder="Zoek op naam, opleiding of vaardigheid"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="student-grid">
        {filtered.map((s) => (
          <article className="student-card" key={s.id}>
            <div className="row-between">
              <Avatar name={s.name} color={s.id % 2 ? "peach" : "lavender"} />
              <Badge status={s.status} />
            </div>
            <h2>{s.name}</h2>
            <p>{s.education || "Opleiding nog aan te vullen"}</p>
            <div className="skill-tags">
              {s.skills
                .split(",")
                .filter(Boolean)
                .slice(0, 3)
                .map((v: string) => (
                  <span key={v}>{v.trim()}</span>
                ))}
            </div>
            <div className="student-meta">
              <span>
                <MapPin size={14} />
                {s.city}
              </span>
              <span>
                <Clock3 size={14} />
                {s.availability || "Nog geen beschikbaarheid"}
              </span>
            </div>
            <button onClick={() => setSelected(s)} className="card-link">
              Bekijk profiel <ArrowUpRight size={17} />
            </button>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="Geen studenten gevonden"
          text="Probeer een andere zoekterm."
        />
      )}
      {selected && (
        <Modal
          title={selected.name}
          subtitle={selected.education}
          onClose={() => setSelected(null)}
        >
          <div className="detail-description">
            <p>
              <strong>Vaardigheden</strong>
              {selected.skills || "Nog niet ingevuld"}
            </p>
            <p>
              <strong>Beschikbaarheid</strong>
              {selected.availability || "Nog niet ingevuld"}
            </p>
            <p>
              <strong>Leerwens</strong>
              {selected.motivation || "Nog niet ingevuld"}
            </p>
            <p>
              <strong>Contact</strong>
              {selected.email}
            </p>
          </div>
          <Form
            fields={[
              {
                name: "status",
                label: "Beoordeling",
                type: "select",
                value:
                  selected.status === "new" ? "qualified" : selected.status,
                options: [
                  { value: "qualified", label: "Geschikt voor matching" },
                  { value: "deferred", label: "Intake uitstellen" },
                ],
              },
              {
                name: "reason",
                label: "Toelichting",
                type: "textarea",
                required: false,
                value: selected.review_reason,
              },
            ]}
            submit="Beoordeling opslaan"
            onSubmit={async (d) => {
              await api("/students/" + selected.id + "/review", "PATCH", d);
              setSelected(null);
              reload();
              notify("Intake beoordeeld.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Jobs() {
  const { user } = useContext(Session),
    { data, error, reload } = useData<Row[]>("/jobs"),
    companies = useData<Row[]>("/companies"),
    [creating, setCreating] = useState(false),
    [review, setReview] = useState<Row | null>(null),
    notify = useContext(ToastContext);
  if (!data || !companies.data)
    return <State error={error || companies.error} />;
  return (
    <>
      <Header
        eyebrow="RUIMTE VOOR TALENT"
        title={
          user!.role === "admin" ? "Bedrijven & opdrachten" : "Mijn opdrachten"
        }
        subtitle="Concrete taken, heldere verwachtingen en een betrokken begeleider."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={17} />
            Opdracht toevoegen
          </Button>
        }
      />
      <div className="company-strip">
        {companies.data.map((c) => (
          <div key={c.id}>
            <span className="company-icon">
              <Building2 size={19} />
            </span>
            <div>
              <strong>{c.name}</strong>
              <small>
                {c.city} · {c.supervisor || "Begeleider ontbreekt"}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="two-columns">
        {data.map((j) => (
          <article className="panel job-card" key={j.id}>
            <div className="row-between">
              <span className="category-label">{j.field}</span>
              <Badge status={j.status} />
            </div>
            <h2>{j.title}</h2>
            <p className="company-line">
              <Building2 size={16} />
              {j.company_name}
            </p>
            <p className="job-description">{j.description}</p>
            <div className="card-details">
              <span>
                <Clock3 size={15} />
                {j.hours} uur per week
              </span>
              <span>
                <ShieldCheck size={15} />
                {j.budget_confirmed
                  ? "Budget bevestigd"
                  : "Budget te bespreken"}
              </span>
            </div>
            {j.review_reason && (
              <p className="review-note">{j.review_reason}</p>
            )}
            <div className="job-footer">
              <span>Begeleider: {j.supervisor || "nog te kiezen"}</span>
              {user!.role === "admin" && (
                <Button kind="secondary" onClick={() => setReview(j)}>
                  Beoordelen <ArrowUpRight size={15} />
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.length && (
        <Empty
          title="Maak ruimte voor een frisse blik"
          text="Omschrijf het werk waarbij een student je kan ondersteunen."
          action={
            <Button onClick={() => setCreating(true)}>
              Eerste opdracht toevoegen
            </Button>
          }
        />
      )}
      {creating && (
        <Modal
          title="Een nieuwe opdracht"
          subtitle="Begin bij het werk dat écht moet gebeuren."
          onClose={() => setCreating(false)}
        >
          <Form
            fields={[
              ...(user!.role === "admin"
                ? [
                    {
                      name: "company_id",
                      label: "Bedrijf",
                      type: "select",
                      options: companies.data.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    },
                  ]
                : []),
              {
                name: "title",
                label: "Titel van het werkpakket",
                placeholder: "Bijvoorbeeld: onze contentkalender versterken",
              },
              {
                name: "field",
                label: "Werkgebied",
                type: "select",
                options: [
                  "Marketing & communicatie",
                  "Sales & klantenopvolging",
                ].map((v) => ({ value: v, label: v })),
              },
              {
                name: "description",
                label: "Taken en begeleiding",
                type: "textarea",
              },
              {
                name: "hours",
                label: "Uren per week",
                type: "number",
                value: 6,
                min: 1,
                max: 20,
              },
              {
                name: "budget_confirmed",
                label:
                  "Er is budget voor loon, werkgeverskosten én Stuard-dienstverlening.",
                type: "checkbox",
                required: false,
              },
            ]}
            submit="Opdracht indienen"
            onSubmit={async (d) => {
              await api("/jobs", "POST", {
                ...d,
                ...(d.company_id ? { company_id: Number(d.company_id) } : {}),
              });
              setCreating(false);
              reload();
              notify("Je opdracht staat klaar voor beoordeling.");
            }}
          />
        </Modal>
      )}
      {review && (
        <Modal
          title="Opdracht beoordelen"
          subtitle={review.title}
          onClose={() => setReview(null)}
        >
          <Form
            fields={[
              {
                name: "status",
                label: "Beoordeling",
                type: "select",
                value: "qualified",
                options: [
                  { value: "qualified", label: "Geschikt voor matching" },
                  { value: "deferred", label: "Uitstellen" },
                ],
              },
              {
                name: "reason",
                label: "Toelichting",
                type: "textarea",
                required: false,
                value: review.review_reason,
              },
            ]}
            onSubmit={async (d) => {
              await api("/jobs/" + review.id + "/review", "PATCH", d);
              setReview(null);
              reload();
              notify("Opdracht beoordeeld.");
            }}
          />
        </Modal>
      )}
    </>
  );
}

function Matches() {
  const { user } = useContext(Session),
    { data, error, reload } = useData<Row[]>("/matches"),
    [modal, setModal] = useState(false),
    [start, setStart] = useState<Row | null>(null),
    notify = useContext(ToastContext);
  if (!data) return <State error={error} />;
  return (
    <>
      <Header
        eyebrow="DE JUISTE VERBINDING"
        title="Matches"
        subtitle="Een voorstel met een reden. Een start waar jullie allebei achter staan."
        action={
          user!.role === "admin" ? (
            <Button onClick={() => setModal(true)}>
              <Plus size={17} />
              Match maken
            </Button>
          ) : undefined
        }
      />
      <div className="info-banner">
        <HeartHandshake size={21} />
        <p>
          Elke match is persoonlijk geselecteerd. Student en bedrijf kiezen zelf
          of ze samen verder willen.
        </p>
      </div>
      <div className="two-columns">
        {data.map((m) => (
          <article className="panel match-card" key={m.id}>
            <div className="match-people">
              <div>
                <Avatar name={m.student_name} color="lavender" />
                <strong>{m.student_name}</strong>
                <small>{m.education}</small>
              </div>
              <span className="match-connector">
                <GitMerge size={20} />
              </span>
              <div>
                <span className="avatar yellow">
                  <Building2 size={23} />
                </span>
                <strong>{m.company_name}</strong>
                <small>{m.hours} uur per week</small>
              </div>
            </div>
            <h3>{m.title}</h3>
            <p className="match-reason">{m.reason}</p>
            <div className="decision-row">
              <span>
                Student <Badge status={m.student_decision} />
              </span>
              <span>
                Bedrijf <Badge status={m.company_decision} />
              </span>
            </div>
            <div className="match-actions">
              {m.placement_id ? (
                <Link
                  className="text-link"
                  to={"/app/trajecten/" + m.placement_id}
                >
                  Naar het traject <ArrowUpRight size={17} />
                </Link>
              ) : m.student_decision === "rejected" ||
                m.company_decision === "rejected" ? (
                <span className="muted">Deze match gaat niet verder.</span>
              ) : user!.role === "admin" ? (
                <Button
                  disabled={
                    m.student_decision !== "accepted" ||
                    m.company_decision !== "accepted"
                  }
                  onClick={() => setStart(m)}
                >
                  Traject voorbereiden <ArrowRight size={16} />
                </Button>
              ) : m[user!.role + "_decision"] === "pending" ? (
                <>
                  <Button
                    onClick={async () => {
                      try {
                        await api("/matches/" + m.id + "/decision", "POST", {
                          decision: "accepted",
                        });
                        reload();
                        notify("Je akkoord is opgeslagen.");
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    <Check size={16} />
                    Ik wil kennismaken en starten
                  </Button>
                  <Button
                    kind="ghost"
                    onClick={async () => {
                      try {
                        await api("/matches/" + m.id + "/decision", "POST", {
                          decision: "rejected",
                        });
                        reload();
                        notify("Je beslissing is opgeslagen.");
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    Past niet
                  </Button>
                </>
              ) : (
                <span className="muted">
                  Je akkoord is ontvangen. Stuard volgt de opstart op.
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.length && (
        <Empty
          title="De juiste match krijgt aandacht"
          text="Zodra er een voorstel is, kun je hier alle afspraken bekijken."
        />
      )}
      {modal && (
        <MatchForm
          onClose={() => setModal(false)}
          onDone={() => {
            setModal(false);
            reload();
            notify("Match voorgesteld aan beide partijen.");
          }}
        />
      )}
      {start && (
        <Modal
          title="Een sterke start"
          subtitle={`${start.student_name} × ${start.company_name}`}
          onClose={() => setStart(null)}
        >
          <Form
            fields={[
              {
                name: "start_date",
                label: "Startdatum",
                type: "date",
                value: today(),
              },
              {
                name: "end_date",
                label: "Einddatum",
                type: "date",
                value: new Date(Date.now() + 56 * 86400000)
                  .toISOString()
                  .slice(0, 10),
              },
              {
                name: "work_package",
                label: "Afgesproken werkpakket",
                type: "textarea",
                value: start.description,
              },
              { name: "goal1", label: "Eerste leerdoel" },
              { name: "goal2", label: "Tweede leerdoel" },
              {
                name: "goal3",
                label: "Derde leerdoel (optioneel)",
                required: false,
              },
              {
                name: "employer_confirmed",
                label:
                  "De werkgever bevestigt dat contract, tewerkstelling en noodzakelijke voorzieningen geregeld zijn.",
                type: "checkbox",
                required: true,
              },
              {
                name: "terms_confirmed",
                label:
                  "Werkpakket, kosten, begeleider en leerafspraken zijn met beide partijen afgestemd.",
                type: "checkbox",
                required: true,
              },
            ]}
            submit="Traject starten"
            onSubmit={async (d) => {
              await api("/matches/" + start.id + "/start", "POST", {
                ...d,
                goals: [d.goal1, d.goal2, d.goal3].filter(Boolean),
              });
              setStart(null);
              reload();
              notify("Het traject is gestart. De opvolgmomenten staan klaar.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function MatchForm({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const students = useData<Row[]>("/students"),
    jobs = useData<Row[]>("/jobs");
  return (
    <Modal
      title="Maak een nieuwe verbinding"
      subtitle="Kies een geschikte student en opdracht en licht je keuze toe."
      onClose={onClose}
    >
      {students.data && jobs.data ? (
        <Form
          fields={[
            {
              name: "student_id",
              label: "Student",
              type: "select",
              options: students.data
                .filter((s) => s.status === "qualified")
                .map((s) => ({
                  value: s.id,
                  label: s.name + " · " + s.education,
                })),
            },
            {
              name: "job_id",
              label: "Opdracht",
              type: "select",
              options: jobs.data
                .filter((j) => j.status === "qualified")
                .map((j) => ({
                  value: j.id,
                  label: j.company_name + " · " + j.title,
                })),
            },
            {
              name: "reason",
              label: "Waarom past deze match?",
              type: "textarea",
              hint: "Denk aan basisvaardigheden, beschikbaarheid en begeleiding.",
            },
          ]}
          submit="Match voorstellen"
          onSubmit={async (d) => {
            await api("/matches", "POST", {
              ...d,
              student_id: Number(d.student_id),
              job_id: Number(d.job_id),
            });
            onDone();
          }}
        />
      ) : (
        <State error={students.error || jobs.error} />
      )}
    </Modal>
  );
}

function Placements() {
  const { data, error } = useData<Row[]>("/placements"),
    [filter, setFilter] = useState("all");
  if (!data) return <State error={error} />;
  const filtered = data.filter((p) => filter === "all" || p.status === filter);
  return (
    <>
      <Header
        eyebrow="LEREN DOOR TE DOEN"
        title="Trajecten"
        subtitle="Werk, leerdoelen en begeleiding. Alles op één plek."
      />
      <div className="list-toolbar">
        <div className="tabs filter-tabs">
          {[
            ["all", "Alle trajecten"],
            ["active", "Actief"],
            ["paused", "Gepauzeerd"],
            ["completed", "Afgerond"],
            ["stopped", "Gestopt"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={filter === v ? "selected" : ""}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="muted">{filtered.length} trajecten</span>
      </div>
      <div className="two-columns">
        {filtered.map((p) => (
          <PlacementCard key={p.id} p={p} />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="Geen trajecten in dit overzicht"
          text="Nieuwe samenwerkingen verschijnen hier zodra ze gestart zijn."
        />
      )}
    </>
  );
}
function PlacementDetail() {
  const { id } = useParams(),
    location = useLocation(),
    { user } = useContext(Session),
    { data: p, error, reload } = useData<Row>("/placements/" + id),
    [tab, setTab] = useState(
      new URLSearchParams(location.search).get("tab") === "portfolio"
        ? "portfolio"
        : "overzicht",
    ),
    [modal, setModal] = useState(""),
    notify = useContext(ToastContext);
  const base = "/placements/" + id;
  async function mutate(path: string, method: string, d: Row, message: string) {
    await api(base + path, method, d);
    setModal("");
    reload();
    notify(message);
  }
  if (!p) return <State error={error} />;
  return (
    <>
      <Link className="back-link" to="/app/trajecten">
        <ChevronLeft size={16} />
        Alle trajecten
      </Link>
      <Header
        eyebrow={p.field}
        title={p.title}
        subtitle={`${p.student_name} × ${p.company_name}`}
        action={<Badge status={p.status} />}
      />
      <div className="trajectory-meta">
        <span>
          <CalendarDays size={17} />
          {fmtDate(p.start_date, true)} – {fmtDate(p.end_date, true)}
        </span>
        <span>
          <Clock3 size={17} />
          {p.weekly_hours} uur / week
        </span>
        <span>
          <Users size={17} />
          Begeleider: {p.supervisor}
        </span>
      </div>
      <div className="tabs detail-tabs">
        {["overzicht", "uren", "opvolging", "portfolio"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
            {t === "uren" && <span className="count">{p.hours.length}</span>}
          </button>
        ))}
      </div>
      {tab === "overzicht" && (
        <div className="detail-columns">
          <section className="panel padded">
            <p className="eyebrow">AFGESPROKEN WERKPAKKET</p>
            <h2>Hier werken jullie aan</h2>
            <p className="body-copy">{p.work_package}</p>
            <div className="divider" />
            <h2>Ruimte om te groeien</h2>
            <p className="muted">Concrete leerdoelen voor deze samenwerking.</p>
            <div className="goals">
              {p.goals.map((g: Row) => (
                <label className={"goal " + (g.done ? "done" : "")} key={g.id}>
                  <input
                    type="checkbox"
                    checked={!!g.done}
                    disabled={user!.role === "student" || p.status !== "active"}
                    onChange={async (e) => {
                      try {
                        await mutate(
                          "/goals/" + g.id,
                          "PATCH",
                          { done: e.target.checked },
                          "Leerdoel bijgewerkt.",
                        );
                      } catch (err) {
                        notify((err as Error).message);
                      }
                    }}
                  />
                  <span>{g.title}</span>
                  {!!g.done && <CheckCircle2 size={18} />}
                </label>
              ))}
            </div>
          </section>
          <div>
            <section className="panel padded">
              <span className="stat-icon yellow">
                <HeartHandshake size={21} />
              </span>
              <h2>Goed geregeld</h2>
              <p className="muted">
                De werkgever regelt het contract en loon. Stuard volgt jullie
                samenwerking op.
              </p>
              <div className="agreement">
                <span>Opstartvergoeding</span>
                <strong>{money(p.setup_cents)}</strong>
              </div>
              <div className="agreement">
                <span>Per actieve maand</span>
                <strong>{money(p.monthly_cents)}</strong>
              </div>
              <small>Exclusief btw en werkgeverskosten.</small>
              {p.stop_reason && <p className="review-note">{p.stop_reason}</p>}
              {user!.role === "admin" &&
                ["active", "paused"].includes(p.status) && (
                  <div className="vertical-actions">
                    <Button kind="secondary" onClick={() => setModal("status")}>
                      {p.status === "active" ? (
                        <Pause size={15} />
                      ) : (
                        <Play size={15} />
                      )}
                      Status wijzigen
                    </Button>
                    <Button kind="ghost" onClick={() => setModal("extend")}>
                      Traject verlengen <ArrowUpRight size={15} />
                    </Button>
                  </div>
                )}
            </section>
            <button
              className="private-help"
              onClick={() => setModal("incident")}
            >
              <ShieldCheck size={20} />
              <span>
                <strong>Iets dat je wilt bespreken?</strong>
                <small>Meld het vertrouwelijk aan Stuard.</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
      )}
      {tab === "uren" && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Gewoon goed bijgehouden</h2>
              <p>
                De werkgever beoordeelt uren voor de eigen loonadministratie.
              </p>
            </div>
            {user!.role === "student" && p.status === "active" && (
              <Button onClick={() => setModal("hours")}>
                <Plus size={16} />
                Uren toevoegen
              </Button>
            )}
          </div>
          {p.hours.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Werkzaamheden</th>
                    <th>Uren</th>
                    <th>Status</th>
                    {user!.role === "company" && <th>Actie</th>}
                  </tr>
                </thead>
                <tbody>
                  {p.hours.map((h: Row) => (
                    <tr key={h.id}>
                      <td>{fmtDate(h.date)}</td>
                      <td>
                        {h.description}
                        {h.review_note && (
                          <small className="block muted">{h.review_note}</small>
                        )}
                      </td>
                      <td>
                        <strong>{h.amount} u</strong>
                      </td>
                      <td>
                        <Badge status={h.status} />
                      </td>
                      {user!.role === "company" && (
                        <td>
                          {h.status === "submitted" && (
                            <div className="inline-actions">
                              <button
                                className="icon-button positive"
                                aria-label="Uren goedkeuren"
                                onClick={async () => {
                                  try {
                                    await mutate(
                                      "/hours/" + h.id,
                                      "PATCH",
                                      { status: "approved" },
                                      "Uren goedgekeurd.",
                                    );
                                  } catch (e) {
                                    notify((e as Error).message);
                                  }
                                }}
                              >
                                <Check size={18} />
                              </button>
                              <button
                                className="icon-button negative"
                                aria-label="Uren afwijzen"
                                onClick={() => setModal("reject-" + h.id)}
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Je eerste uren komen hier"
              text="Registreer gewerkte uren en beschrijf kort wat je gedaan hebt."
            />
          )}
        </section>
      )}
      {tab === "opvolging" && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Blijven praten, blijven groeien</h2>
              <p>Feedback en geplande gesprekken voor dit traject.</p>
            </div>
            <Button onClick={() => setModal("note")}>
              <Plus size={16} />
              Toevoegen
            </Button>
          </div>
          <div className="timeline">
            {p.notes.map((n: Row) => (
              <article key={n.id}>
                <span className={"timeline-dot " + n.kind}>
                  {n.kind === "checkin" ? (
                    <CalendarDays size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                </span>
                <div>
                  <div className="row-between">
                    <strong>{n.author}</strong>
                    <small>{fmtDate(n.created_at)}</small>
                  </div>
                  {n.kind === "checkin" && (
                    <span className="category-label">
                      Opvolgmoment · {fmtDate(n.due_date, true)}
                    </span>
                  )}
                  <p>{n.body}</p>
                </div>
              </article>
            ))}
            {!p.notes.length && (
              <Empty
                title="Begin het gesprek"
                text="Deel feedback of plan als beheerder een opvolgmoment."
              />
            )}
          </div>
        </section>
      )}
      {tab === "portfolio" && <PortfolioEditor p={p} reload={reload} />}
      {modal === "hours" && (
        <Modal
          title="Wat heb je gedaan?"
          subtitle="Uren worden ter beoordeling naar je begeleider gestuurd."
          onClose={() => setModal("")}
        >
          <Form
            fields={[
              {
                name: "date",
                label: "Werkdag",
                type: "date",
                value: today(),
                min: p.start_date,
                max: today(),
              },
              {
                name: "amount",
                label: "Aantal uren",
                type: "number",
                value: 4,
                min: 0.25,
                max: 24,
                step: ".25",
              },
              { name: "description", label: "Werkzaamheden", type: "textarea" },
            ]}
            submit="Uren indienen"
            onSubmit={(d) =>
              mutate("/hours", "POST", d, "Uren ingediend bij je begeleider.")
            }
          />
        </Modal>
      )}
      {modal.startsWith("reject-") && (
        <Modal title="Uren terugsturen" onClose={() => setModal("")}>
          <Form
            fields={[
              {
                name: "review_note",
                label: "Wat moet worden aangepast?",
                type: "textarea",
              },
            ]}
            submit="Terugsturen"
            onSubmit={(d) =>
              mutate(
                "/hours/" + modal.split("-")[1],
                "PATCH",
                { ...d, status: "rejected" },
                "Uren afgewezen met toelichting.",
              )
            }
          />
        </Modal>
      )}
      {modal === "note" && (
        <Modal
          title="Even stilstaan bij de voortgang"
          onClose={() => setModal("")}
        >
          <Form
            fields={[
              ...(user!.role === "admin"
                ? [
                    {
                      name: "kind",
                      label: "Soort",
                      type: "select",
                      value: "feedback",
                      options: [
                        {
                          value: "feedback",
                          label: "Feedback of gespreksnotitie",
                        },
                        { value: "checkin", label: "Opvolgmoment plannen" },
                      ],
                    },
                    {
                      name: "due_date",
                      label: "Datum (bij een opvolgmoment)",
                      type: "date",
                      required: false,
                    },
                  ]
                : []),
              { name: "body", label: "Je bericht", type: "textarea" },
            ]}
            submit="Toevoegen"
            onSubmit={(d) =>
              mutate("/notes", "POST", d, "Opvolging toegevoegd.")
            }
          />
        </Modal>
      )}
      {modal === "incident" && (
        <Modal
          title="We luisteren naar je"
          subtitle="Alleen Stuard-beheer kan je melding lezen. Dit is geen permanent bewaakt noodkanaal."
          onClose={() => setModal("")}
        >
          <Form
            fields={[
              {
                name: "body",
                label: "Wat wil je met ons bespreken?",
                type: "textarea",
              },
            ]}
            submit="Vertrouwelijk melden"
            onSubmit={(d) =>
              mutate(
                "/incidents",
                "POST",
                d,
                "Je melding is vertrouwelijk bij Stuard ontvangen.",
              )
            }
          />
        </Modal>
      )}
      {modal === "status" && (
        <Modal title="Trajectstatus wijzigen" onClose={() => setModal("")}>
          <Form
            fields={[
              {
                name: "status",
                label: "Nieuwe status",
                type: "select",
                options: [
                  {
                    value: p.status === "active" ? "paused" : "active",
                    label: p.status === "active" ? "Pauzeren" : "Hervatten",
                  },
                  { value: "completed", label: "Afronden" },
                  { value: "stopped", label: "Voortijdig stoppen" },
                ],
              },
              {
                name: "reason",
                label: "Reden en gemaakte afspraken",
                type: "textarea",
              },
            ]}
            onSubmit={(d) =>
              mutate("/status", "PATCH", d, "Trajectstatus bijgewerkt.")
            }
          />
        </Modal>
      )}
      {modal === "extend" && (
        <Modal
          title="Samen verder"
          subtitle="Een verlenging blijft hetzelfde traject, zonder nieuwe opstartvergoeding."
          onClose={() => setModal("")}
        >
          <Form
            fields={[
              {
                name: "end_date",
                label: "Nieuwe einddatum",
                type: "date",
                min: p.end_date,
              },
              {
                name: "reason",
                label: "Nieuwe werk- en leerafspraken",
                type: "textarea",
              },
              {
                name: "both_confirmed",
                label:
                  "Student en bedrijf hebben deze verlenging en de kosten bevestigd.",
                type: "checkbox",
                required: true,
              },
            ]}
            submit="Verlenging vastleggen"
            onSubmit={(d) => mutate("/extend", "PATCH", d, "Traject verlengd.")}
          />
        </Modal>
      )}
    </>
  );
}

function PortfolioEditor({ p, reload }: { p: Row; reload: () => void }) {
  const { user } = useContext(Session),
    notify = useContext(ToastContext),
    [editing, setEditing] = useState(false),
    [review, setReview] = useState(false),
    port = p.portfolio;
  const base = "/placements/" + p.id + "/portfolio";
  return (
    <section className="panel padded portfolio-editor">
      <div className="section-head flush">
        <div>
          <p className="eyebrow">BEWIJS VAN JOUW GROEI</p>
          <h2>Van ervaring naar een verhaal</h2>
          <p>
            Leg je eigen bijdrage vast. Je begeleider controleert wat je mag
            delen.
          </p>
        </div>
        <Badge status={port.status} />
      </div>
      {editing ? (
        <Form
          fields={[
            { name: "title", label: "Titel", value: port.title },
            {
              name: "context",
              label: "Context en opdracht",
              type: "textarea",
              value: port.context,
            },
            {
              name: "contribution",
              label: "Jouw eigen bijdrage",
              type: "textarea",
              value: port.contribution,
            },
            {
              name: "result",
              label: "Resultaat",
              type: "textarea",
              value: port.result,
              hint: "Noem concrete opleveringen. Gebruik alleen onderbouwde effectcijfers.",
            },
            {
              name: "reflection",
              label: "Wat heb je geleerd?",
              type: "textarea",
              value: port.reflection,
            },
            {
              name: "evidence",
              label: "Beschrijving van deelbaar bewijs",
              type: "textarea",
              required: false,
              value: port.evidence,
              hint: "Gebruik geen vertrouwelijke klantgegevens. Bestandsuploads vallen buiten deze pilot.",
            },
          ]}
          submit="Concept bewaren"
          onSubmit={async (d) => {
            await api(base, "PUT", d);
            setEditing(false);
            reload();
            notify(
              "Concept bewaard. Een gewijzigde versie vraagt opnieuw goedkeuring.",
            );
          }}
        />
      ) : port.title ? (
        <div className="portfolio-story">
          <h2>{port.title}</h2>
          {[
            ["context", "Context"],
            ["contribution", "Eigen bijdrage"],
            ["result", "Resultaat"],
            ["reflection", "Reflectie"],
            ["evidence", "Bewijsbeschrijving"],
          ].map(
            ([key, label]) =>
              port[key] && (
                <div key={key}>
                  <h3>{label}</h3>
                  <p>{port[key]}</p>
                </div>
              ),
          )}
        </div>
      ) : (
        <Empty
          title="Jouw werk verdient een verhaal"
          text="Schrijf wat je hebt gedaan, wat het opleverde en wat je ervan leerde."
        />
      )}
      {port.review_note && (
        <div className="info-banner">
          <FileText size={18} />
          <p>{port.review_note}</p>
        </div>
      )}
      {port.status === "approved" && (
        <p className="approval-note">
          <ShieldCheck size={17} />
          Versie {port.version} bevestigd door {port.reviewer} op{" "}
          {fmtDate(port.reviewed_at)}.
        </p>
      )}
      <div className="actions portfolio-actions">
        {user!.role === "student" && !editing && (
          <>
            <Button kind="secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              {port.title ? "Case bewerken" : "Case schrijven"}
            </Button>
            {["draft", "changes_requested"].includes(port.status) &&
              port.title && (
                <Button
                  onClick={async () => {
                    try {
                      await api(base + "/submit", "POST", {});
                      reload();
                      notify("Case ingediend bij je begeleider.");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  <Send size={16} />
                  Ter goedkeuring indienen
                </Button>
              )}
          </>
        )}
        {editing && (
          <Button kind="ghost" onClick={() => setEditing(false)}>
            Annuleren
          </Button>
        )}
        {user!.role === "company" && port.status === "submitted" && (
          <Button onClick={() => setReview(true)}>
            <ShieldCheck size={17} />
            Case beoordelen
          </Button>
        )}
        {port.status === "approved" && (
          <a className="button secondary" href={"/api" + base + "/export"}>
            <Download size={16} />
            Portfolio exporteren
          </a>
        )}
      </div>
      <p className="fine-print">
        Je portfolio blijft privé. Goedkeuring geldt voor deze versie en is geen
        academische erkenning. Exporteren blijft ook na afronding mogelijk.
      </p>
      {review && (
        <Modal
          title="Portfolio beoordelen"
          subtitle={`Je beoordeelt versie ${port.version}.`}
          onClose={() => setReview(false)}
        >
          <Form
            fields={[
              {
                name: "status",
                label: "Beoordeling",
                type: "select",
                value: "approved",
                options: [
                  {
                    value: "approved",
                    label: "Bijdrage bevestigen en export goedkeuren",
                  },
                  { value: "changes_requested", label: "Aanpassing vragen" },
                ],
              },
              {
                name: "review_note",
                label: "Feedback",
                type: "textarea",
                required: false,
              },
              {
                name: "sharing_checked",
                label:
                  "Ik heb persoonsgegevens, vertrouwelijkheid en gebruiksrechten van deze versie gecontroleerd.",
                type: "checkbox",
                required: false,
              },
            ]}
            submit="Beoordeling bewaren"
            onSubmit={async (d) => {
              await api(base + "/review", "POST", {
                ...d,
                version: port.version,
              });
              setReview(false);
              reload();
              notify("Beoordeling opgeslagen.");
            }}
          />
        </Modal>
      )}
    </section>
  );
}
function Portfolios() {
  const { data, error } = useData<Row[]>("/placements");
  if (!data) return <State error={error} />;
  return (
    <>
      <Header
        eyebrow="ERVARING OM MEE TE NEMEN"
        title="Portfolio"
        subtitle="Geen losse sterren. Wel een concreet verhaal over echt werk."
      />
      <div className="portfolio-banner">
        <FolderHeart size={37} />
        <div>
          <h2>Maak je groei zichtbaar.</h2>
          <p>
            Beschrijf je bijdrage, verzamel goedgekeurd bewijs en neem je
            ervaring mee naar je volgende stap.
          </p>
        </div>
      </div>
      <div className="two-columns">
        {data.map((p) => (
          <article className="panel portfolio-tile" key={p.id}>
            <span className="category-label">{p.field}</span>
            <h2>{p.student_name}</h2>
            <p>
              {p.company_name} · {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
            </p>
            <h3>{p.title}</h3>
            <Link
              className="text-link"
              to={"/app/trajecten/" + p.id + "?tab=portfolio"}
            >
              Open traject en portfolio <ArrowUpRight size={17} />
            </Link>
          </article>
        ))}
      </div>
      {!data.length && (
        <Empty
          title="Je verhaal begint in de praktijk"
          text="Zodra je een traject start, kun je een portfolio-case opbouwen."
        />
      )}
    </>
  );
}

function Charges() {
  const { user } = useContext(Session),
    { data, error, reload } = useData<Row[]>("/charges"),
    placements = useData<Row[]>("/placements"),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Row | null>(null),
    notify = useContext(ToastContext);
  if (!data || !placements.data)
    return <State error={error || placements.error} />;
  return (
    <>
      <Header
        eyebrow="HELDER OVER DIENSTVERLENING"
        title="Dienstverlening"
        subtitle="Houd geleverde begeleiding en externe facturatie uit elkaar."
        action={
          user!.role === "admin" ? (
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} />
              Regel toevoegen
            </Button>
          ) : undefined
        }
      />
      <div className="info-banner">
        <ReceiptText size={22} />
        <p>
          Dit is een opvolgoverzicht, geen officiële facturatie of
          loonadministratie. Facturen verstuur je via geschikte
          boekhoudsoftware. Bedragen zijn exclusief btw.
        </p>
      </div>
      <div className="three-columns finance-stats">
        {[
          ["draft", "Voor te bereiden"],
          ["invoiced", "Openstaand"],
          ["paid", "Betaald"],
        ].map(([status, label]) => (
          <div className="stat-card" key={status}>
            <span>{label}</span>
            <strong>
              {money(
                data
                  .filter((c) => c.status === status)
                  .reduce((n, c) => n + c.amount_cents, 0),
              )}
            </strong>
            <small>Geregistreerde dienstverleningsregels</small>
          </div>
        ))}
      </div>
      <section className="panel">
        {data.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Bedrijf / student</th>
                  <th>Periode</th>
                  <th>Dienst</th>
                  <th>Bedrag</th>
                  <th>Status</th>
                  <th>Referentie</th>
                  {user!.role === "admin" && <th />}
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.company_name}</strong>
                      <small className="block muted">{c.student_name}</small>
                    </td>
                    <td>{c.period}</td>
                    <td>
                      {c.kind === "setup" ? "Opstart" : "Actieve begeleiding"}
                    </td>
                    <td>{money(c.amount_cents)}</td>
                    <td>
                      <Badge status={c.status} />
                    </td>
                    <td>{c.reference || "—"}</td>
                    {user!.role === "admin" && (
                      <td>
                        {c.status !== "paid" && (
                          <button
                            className="icon-button"
                            aria-label="Factuurstatus bijwerken"
                            onClick={() => setEditing(c)}
                          >
                            <Pencil size={17} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nog geen dienstverleningsregels"
            text="Registreer alleen afgesproken en daadwerkelijk geleverde dienstverlening."
          />
        )}
      </section>
      {adding && (
        <Modal
          title="Geleverde dienstverlening"
          subtitle="Bevestig de dienstverlening per periode. Een volledig gepauzeerde maand zonder begeleiding telt niet mee."
          onClose={() => setAdding(false)}
        >
          <Form
            fields={[
              {
                name: "placement_id",
                label: "Traject",
                type: "select",
                options: placements.data.map((p) => ({
                  value: p.id,
                  label: p.student_name + " × " + p.company_name,
                })),
              },
              {
                name: "kind",
                label: "Dienst",
                type: "select",
                value: "monthly",
                options: [
                  { value: "monthly", label: "Actieve maand" },
                  { value: "setup", label: "Eenmalige opstart" },
                ],
              },
              {
                name: "period",
                label: "Maand",
                type: "month",
                value: today().slice(0, 7),
              },
              {
                name: "delivered",
                label:
                  "De afgesproken dienstverlening is in deze periode daadwerkelijk geleverd. Dit is geen volledig gepauzeerde maand zonder dienstverlening.",
                type: "checkbox",
                required: true,
              },
            ]}
            submit="Voorstel toevoegen"
            onSubmit={async (d) => {
              await api("/charges", "POST", {
                ...d,
                placement_id: Number(d.placement_id),
              });
              setAdding(false);
              reload();
              notify("Dienstverleningsregel toegevoegd.");
            }}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title="Externe facturatie opvolgen"
          onClose={() => setEditing(null)}
        >
          <Form
            fields={[
              {
                name: "status",
                label: "Status",
                type: "select",
                value: editing.status === "draft" ? "invoiced" : "paid",
                options: [
                  {
                    value: editing.status === "draft" ? "invoiced" : "paid",
                    label:
                      editing.status === "draft"
                        ? "Extern gefactureerd"
                        : "Betaling ontvangen",
                  },
                ],
              },
              {
                name: "reference",
                label: "Referentie in je boekhoudsoftware",
                value: editing.reference,
              },
            ]}
            onSubmit={async (d) => {
              await api("/charges/" + editing.id, "PATCH", d);
              setEditing(null);
              reload();
              notify("Factuurstatus bijgewerkt.");
            }}
          />
        </Modal>
      )}
    </>
  );
}

function Profile() {
  const { user, setUser } = useContext(Session),
    { data, error, reload } = useData("/profile"),
    notify = useContext(ToastContext);
  if (!data) return <State error={error} />;
  const p = data.profile || {};
  return (
    <>
      <Header
        eyebrow="HET BEGINT BIJ JOU"
        title="Mijn profiel"
        subtitle="Een goede intake helpt ons om de juiste verbinding te maken."
      />
      <section className="panel padded profile-panel">
        <div className="profile-heading">
          <Avatar name={user!.name} color="peach" />
          <div>
            <h2>{user!.name}</h2>
            <p>{roleNames[user!.role]}</p>
          </div>
          {p.status && <Badge status={p.status} />}
        </div>
        <Form
          key={JSON.stringify(data)}
          fields={[
            { name: "name", label: "Je naam", value: user!.name },
            ...(user!.role === "student"
              ? [
                  {
                    name: "education",
                    label: "Opleiding en onderwijsinstelling",
                    value: p.education,
                  },
                  {
                    name: "city",
                    label: "Regio / woonplaats",
                    value: p.city || "Gent",
                  },
                  {
                    name: "skills",
                    label: "Basisvaardigheden",
                    value: p.skills,
                    hint: "Bijvoorbeeld: copywriting, Excel, CRM. Scheid vaardigheden met een komma.",
                  },
                  {
                    name: "availability",
                    label: "Beschikbaarheid en reistijd",
                    value: p.availability,
                    hint: "Vermeld ook les- en examenperiodes.",
                  },
                  {
                    name: "motivation",
                    label: "Wat wil je leren?",
                    type: "textarea",
                    value: p.motivation,
                  },
                ]
              : user!.role === "company"
                ? [
                    {
                      name: "company_name",
                      label: "Bedrijfsnaam",
                      value: p.name,
                    },
                    { name: "sector", label: "Sector", value: p.sector },
                    {
                      name: "city",
                      label: "Vestigingsplaats",
                      value: p.city || "Gent",
                    },
                    {
                      name: "supervisor",
                      label: "Vaste begeleider",
                      value: p.supervisor,
                    },
                    {
                      name: "description",
                      label: "Over het bedrijf en beschikbare begeleiding",
                      type: "textarea",
                      value: p.description,
                    },
                  ]
                : []),
          ]}
          submit="Profiel bewaren"
          onSubmit={async (d) => {
            await api("/profile", "PUT", d);
            setUser({ ...user!, name: d.name });
            reload();
            notify("Profiel bewaard. Stuard kan je intake nu beoordelen.");
          }}
        />
        <p className="fine-print">
          Je gegevens zijn niet publiek doorzoekbaar. Alleen noodzakelijke
          profielinformatie wordt gedeeld bij een persoonlijk matchvoorstel.
        </p>
      </section>
    </>
  );
}
function SettingsPage() {
  const { meta, refreshMeta } = useContext(Session),
    notify = useContext(ToastContext);
  return (
    <>
      <Header
        eyebrow="DE BASIS OP ORDE"
        title="Instellingen"
        subtitle="Pilotafspraken die passen bij de manier waarop jullie werken."
      />
      <section className="panel padded profile-panel">
        <h2>Het pilotaanbod</h2>
        <p className="muted">
          Nieuwe prijzen gelden alleen voor nieuwe trajecten. Bestaande
          afspraken blijven bewaard.
        </p>
        <Form
          fields={[
            {
              name: "region",
              label: "Startregio",
              value: meta.settings.region,
            },
            {
              name: "setup",
              label: "Opstartvergoeding in euro (excl. btw)",
              type: "number",
              value: meta.settings.setup_cents / 100,
              min: 0,
              step: ".01",
            },
            {
              name: "monthly",
              label: "Actieve maand in euro (excl. btw)",
              type: "number",
              value: meta.settings.monthly_cents / 100,
              min: 0,
              step: ".01",
            },
          ]}
          onSubmit={async (d) => {
            await api("/settings", "PUT", {
              region: d.region,
              setup_cents: Math.round(d.setup * 100),
              monthly_cents: Math.round(d.monthly * 100),
            });
            refreshMeta();
            notify("Pilotafspraken bijgewerkt.");
          }}
        />
      </section>
      <section className="panel padded profile-panel">
        <h2>Je eigen gegevens</h2>
        <p className="muted">Je naam aanpassen doe je in je profiel.</p>
        <Link className="text-link" to="/app/profiel">
          Mijn profiel openen <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
