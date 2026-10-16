import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function demo(page: Page, role: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await expect(page.getByRole("heading", { name: /^Dag / })).toBeVisible();
}
test("key pages pass automated WCAG A/AA checks", async ({ page }) => {
  for (const route of ["/", "/login", "/register"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await demo(page, "Beheer");
  for (const route of ["/app", "/app/studenten", "/app/trajecten/1"]) {
    await page.goto(route);
    await expect(page.getByText("Even ophalen…")).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
test("desktop dashboard, all admin screens and screenshots", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demo(page, "Beheer");
  await expect(page.getByText("DEMO · fictieve gegevens")).toBeVisible();
  await page.screenshot({
    path: ".data/screens/dashboard-desktop.png",
    fullPage: true,
  });
  for (const [path, title] of [
    ["studenten", "Studenten"],
    ["opdrachten", "Bedrijven & opdrachten"],
    ["matches", "Matches"],
    ["trajecten", "Trajecten"],
    ["portfolio", "Portfolio"],
    ["dienstverlening", "Dienstverlening"],
    ["instellingen", "Instellingen"],
  ]) {
    await page.goto("/app/" + path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Even ophalen…")).toHaveCount(0);
  }
  await page.goto("/app/studenten");
  await page.getByLabel("Studenten zoeken").fill("Lotte");
  await expect(page.locator(".student-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("landing and mobile dashboard work without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Werk dat je/ }),
  ).toBeVisible();
  await page.screenshot({
    path: ".data/screens/landing-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await demo(page, "Student");
  await page.screenshot({
    path: ".data/screens/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Navigatie openen" }).click();
  await page.getByRole("link", { name: "Trajecten", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Trajecten", exact: true }),
  ).toBeVisible();
  await page.locator(".placement-card").first().click();
  await page
    .getByRole("button", { name: "Uren", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Gewoon goed bijgehouden" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("three roles complete a new match, hours, feedback and approved portfolio export", async ({
  browser,
}) => {
  const adminContext = await browser.newContext(),
    studentContext = await browser.newContext(),
    companyContext = await browser.newContext();
  const admin = await adminContext.newPage(),
    student = await studentContext.newPage(),
    company = await companyContext.newPage();
  await demo(admin, "Beheer");
  for (const [page, role, name, email, companyName] of [
    [student, "student", "Test Student", "browser-student@test.invalid", ""],
    [
      company,
      "company",
      "Test Begeleider",
      "browser-company@test.invalid",
      "Test Atelier",
    ],
  ] as const) {
    await page.goto("/register?role=" + role);
    await page.getByLabel("Je naam").fill(name);
    if (companyName) await page.getByLabel("Bedrijfsnaam").fill(companyName);
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByLabel("Wachtwoord").fill("Pilot-password-2026");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(
      page.getByRole("heading", { name: "Mijn profiel", exact: true }),
    ).toBeVisible();
  }
  await student
    .getByLabel("Opleiding en onderwijsinstelling")
    .fill("Marketing · HOGENT");
  await student
    .getByLabel("Basisvaardigheden")
    .fill("Copywriting, contentplanning");
  await student
    .getByLabel("Beschikbaarheid en reistijd")
    .fill("Dinsdag, 6 uur");
  await student
    .getByLabel("Wat wil je leren?")
    .fill("Een briefing omzetten naar bruikbare content.");
  await student.getByRole("button", { name: "Profiel bewaren" }).click();
  await expect(student.getByRole("status")).toContainText("Profiel bewaard");
  await company.getByLabel("Sector").fill("Design");
  await company
    .getByLabel("Over het bedrijf")
    .fill("Kleine designstudio met begeleiding.");
  await company.getByRole("button", { name: "Profiel bewaren" }).click();
  await expect(company.getByRole("status")).toContainText("Profiel bewaard");
  await company.goto("/app/opdrachten");
  await company
    .getByRole("button", { name: "Opdracht toevoegen", exact: true })
    .click();
  await company
    .getByLabel("Titel van het werkpakket")
    .fill("Een verhaal voor Test Atelier");
  await company
    .getByLabel("Werkgebied")
    .selectOption("Marketing & communicatie");
  await company
    .getByLabel("Taken en begeleiding")
    .fill("Schrijf vier conceptberichten met onze begeleider.");
  await company.getByLabel("Er is budget").check();
  await company.getByRole("button", { name: "Opdracht indienen" }).click();
  await expect(company.getByRole("status")).toContainText("opdracht");
  await admin.goto("/app/studenten");
  await admin
    .locator(".student-card")
    .filter({ hasText: "Test Student" })
    .getByRole("button", { name: "Bekijk profiel" })
    .click();
  await admin.getByRole("button", { name: "Beoordeling opslaan" }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await admin.goto("/app/opdrachten");
  await admin
    .locator(".job-card")
    .filter({ hasText: "Een verhaal voor Test Atelier" })
    .getByRole("button", { name: "Beoordelen" })
    .click();
  await admin.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await admin.goto("/app/matches");
  await admin.getByRole("button", { name: "Match maken" }).click();
  await admin
    .getByLabel("Student", { exact: false })
    .selectOption({ label: "Test Student · Marketing · HOGENT" });
  await admin
    .getByLabel("Opdracht", { exact: false })
    .selectOption({ label: "Test Atelier · Een verhaal voor Test Atelier" });
  await admin
    .getByLabel("Waarom past deze match?")
    .fill("De schrijfvaardigheden en dinsdagbeschikbaarheid passen goed.");
  await admin.getByRole("button", { name: "Match voorstellen" }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await expect(
    admin
      .locator(".match-card")
      .filter({ hasText: "Test Student" })
      .getByRole("button", { name: "Traject voorbereiden" }),
  ).toBeDisabled();
  for (const page of [student, company]) {
    await page.goto("/app/matches");
    await page
      .getByRole("button", { name: "Ik wil kennismaken en starten" })
      .click();
    await expect(page.getByRole("status")).toContainText("akkoord");
  }
  await admin.reload();
  await admin
    .locator(".match-card")
    .filter({ hasText: "Test Student" })
    .getByRole("button", { name: "Traject voorbereiden" })
    .click();
  await admin.getByLabel("Eerste leerdoel").fill("Heldere teksten schrijven");
  await admin
    .getByLabel("Tweede leerdoel")
    .fill("Feedback zelfstandig verwerken");
  await admin.getByLabel("De werkgever bevestigt").check();
  await admin.getByLabel("Werkpakket, kosten").check();
  await admin
    .getByRole("button", { name: "Traject starten", exact: true })
    .click();
  await expect(admin.getByRole("status")).toContainText("traject is gestart");
  await student.goto("/app/trajecten");
  await student
    .locator(".placement-card")
    .filter({ hasText: "Test Atelier" })
    .click();
  const url = student.url();
  await student
    .getByRole("button", { name: "Uren", exact: false })
    .first()
    .click();
  await student.getByRole("button", { name: "Uren toevoegen" }).click();
  await student
    .getByLabel("Werkzaamheden")
    .fill("Eerste briefing verwerkt in vier concepten.");
  await student.getByRole("button", { name: "Uren indienen" }).click();
  await expect(student.getByRole("status")).toContainText("Uren ingediend");
  await company.goto(url);
  await company
    .getByRole("button", { name: "Uren", exact: false })
    .first()
    .click();
  await company.getByRole("button", { name: "Uren goedkeuren" }).click();
  await expect(company.locator("table").getByText("Goedgekeurd")).toBeVisible();
  await company.getByRole("button", { name: "Opvolging", exact: true }).click();
  await company.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await company
    .getByLabel("Je bericht")
    .fill("Sterke eerste versie. Let op de toon van ons merk.");
  await company
    .getByRole("dialog")
    .getByRole("button", { name: "Toevoegen", exact: true })
    .click();
  await expect(company.getByRole("status")).toContainText(
    "Opvolging toegevoegd",
  );
  await student.getByRole("button", { name: "Portfolio", exact: true }).click();
  await student.getByRole("button", { name: "Case schrijven" }).click();
  for (const [field, value] of [
    ["Titel", "Content voor Test Atelier"],
    [
      "Context en opdracht",
      "Een kleine studio met behoefte aan heldere teksten.",
    ],
    ["Jouw eigen bijdrage", "Ik schreef vier conceptberichten."],
    ["Resultaat", "Vier nagekeken concepten en een contentkalender."],
    ["Wat heb je geleerd?", "Feedback vertalen naar sterkere teksten."],
  ])
    await student.getByLabel(field, { exact: false }).fill(value);
  await student.getByRole("button", { name: "Concept bewaren" }).click();
  await expect(student.getByRole("status")).toContainText("Concept bewaard");
  await student
    .getByRole("button", { name: "Ter goedkeuring indienen" })
    .click();
  await expect(student.getByRole("status")).toContainText("Case ingediend");
  await company.reload();
  await company.getByRole("button", { name: "Portfolio", exact: true }).click();
  await company.getByRole("button", { name: "Case beoordelen" }).click();
  await company.getByLabel("Ik heb persoonsgegevens").check();
  await company.getByRole("button", { name: "Beoordeling bewaren" }).click();
  await expect(company.getByRole("status")).toContainText(
    "Beoordeling opgeslagen",
  );
  await student.reload();
  await student.getByRole("button", { name: "Portfolio", exact: true }).click();
  const downloadPromise = student.waitForEvent("download");
  await student.getByRole("link", { name: "Portfolio exporteren" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /stuard-portfolio-\d+-v\d+\.txt/,
  );
  await student.getByRole("button", { name: "Case bewerken" }).click();
  await student
    .getByLabel("Resultaat", { exact: false })
    .fill("Een gewijzigde beschrijving.");
  await student.getByRole("button", { name: "Concept bewaren" }).click();
  await expect(
    student.getByRole("link", { name: "Portfolio exporteren" }),
  ).toHaveCount(0);
  await adminContext.close();
  await studentContext.close();
  await companyContext.close();
});
