/**
 * Drives the built static export in a real browser: loads the demo data through
 * the actual ingest pipeline (pdf.js worker, IndexedDB, parser), walks every
 * screen, exercises the export and destructive paths, and screenshots each one.
 * Fails loudly on any console error.
 *
 *   npx serve out -p 3187 -s &   # then:
 *   npm run verify:ui
 */
import { chromium, type ConsoleMessage, type Page } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3187";
const SHOTS = "docs/screenshots";

const errors: string[] = [];

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

  const shot = async (name: string) => {
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
    console.log(`  screenshot: ${name}.png`);
  };

  console.log("1. Landing");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Your labs, finally read");
  await shot("01-landing");

  console.log("2. Demo ingest (real pdf.js + IndexedDB)");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/timeline", { timeout: 60_000 });
  await page.waitForSelector("text=Worth a look", { timeout: 60_000 });

  const tiles = await readTiles(page);
  console.log("   tiles:", JSON.stringify(tiles));
  assert(
    Number(tiles["Markers tracked"]) >= 20,
    `expected 20+ markers, got ${tiles["Markers tracked"]}`,
  );
  assert(
    Number(tiles["Outside range"]) > 0,
    `expected out-of-range markers, got ${tiles["Outside range"]}`,
  );
  assert(Number(tiles["In range"]) > 0, `expected in-range markers, got ${tiles["In range"]}`);

  const headline = await page.locator("h1").first().textContent();
  console.log("   headline:", headline?.trim());
  assert(/outside the range/i.test(headline ?? ""), "headline did not state the finding");
  await shot("02-overview");

  console.log("3. Attention list + panel grouping");
  const top = await page.locator("main ul li a").first().textContent();
  console.log("   top of list:", top?.replace(/\s+/g, " ").trim());
  await page.waitForSelector("text=Lipids");
  await page.waitForSelector("text=Metabolic");

  console.log("4. Search");
  await page.getByPlaceholder("Search markers…").fill("creat");
  await page.waitForTimeout(250);
  const matches = await page.locator("main a[href^='/marker']").count();
  console.log(`   cards matching "creat": ${matches}`);
  assert(matches >= 1, "search returned no markers");

  console.log("5. Marker detail (creatinine — the seeded anomaly)");
  await page.goto(`${BASE}/marker?id=creatinine&unit=mg%2FdL`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Why this is flagged");
  const drift = await page.locator("text=/up 3[0-9]% vs/").first().textContent();
  console.log("   drift:", drift?.trim());
  assert(!!drift, "creatinine drift flag missing from marker detail");
  const timeInRange = await readMetric(page, "Time in range");
  console.log("   time in range:", timeInRange);
  assert(!!timeInRange && timeInRange !== "—", "time-in-range metric missing");
  await shot("03-marker-detail");

  console.log("6. Visit summary");
  await page.goto(`${BASE}/summary`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Markers outside range or moving quickly");
  await shot("04-visit-summary");

  console.log("7. Upload + duplicate rejection");
  await page.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Drop PDFs here");
  await shot("05-upload");
  await page.setInputFiles('input[type="file"]', "tests/fixtures/pdfs/acme-2021.pdf");
  await page.waitForSelector("text=already in your record", { timeout: 30_000 });
  console.log("   duplicate correctly rejected");

  console.log("8. Data page + export");
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Manage record");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export record \(json\)/i }).click(),
  ]);
  console.log("   exported:", download.suggestedFilename());
  assert(
    download.suggestedFilename().endsWith(".json"),
    `unexpected export filename ${download.suggestedFilename()}`,
  );
  await shot("06-data");

  console.log("9. Dark theme");
  await page.goto(`${BASE}/timeline`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /switch to dark theme/i }).click();
  await page.waitForTimeout(300);
  const theme = await page.evaluate(`document.documentElement.dataset.theme`);
  assert(theme === "dark", `theme toggle did not apply, got ${theme}`);
  await shot("07-overview-dark");
  await page.getByRole("button", { name: /switch to light theme/i }).click();
  await page.waitForTimeout(200);

  console.log("10. Wipe control empties IndexedDB");
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /wipe all data/i }).click();
  await page.getByRole("button", { name: /yes, delete everything/i }).click();
  await page.waitForSelector("text=No reports stored", { timeout: 30_000 });
  const remaining = (await page.evaluate(`new Promise((resolve, reject) => {
    const req = indexedDB.open("labloom");
    req.onsuccess = () => {
      const db = req.result;
      const count = db.transaction("reports", "readonly").objectStore("reports").count();
      count.onsuccess = () => { db.close(); resolve(count.result); };
      count.onerror = () => reject(count.error);
    };
    req.onerror = () => reject(req.error);
  })`)) as number;
  console.log(`   reports left in IndexedDB after wipe: ${remaining}`);
  assert(remaining === 0, `wipe left ${remaining} reports behind`);

  console.log("11. Empty state");
  await page.goto(`${BASE}/timeline`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Nothing to show yet");
  await shot("08-empty-state");

  await browser.close();

  if (errors.length > 0) {
    console.error(`\nFAILED — ${errors.length} console error(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log("\nAll checks passed with zero console errors.");
}

/** Reads the overview stat tiles by their label text. */
async function readTiles(page: Page): Promise<Record<string, string>> {
  return (await page.evaluate(`(() => {
    const out = {};
    for (const p of Array.from(document.querySelectorAll("p"))) {
      const label = p.textContent.trim();
      const next = p.nextElementSibling;
      if (next && /^(Markers tracked|Outside range|In range|History)$/.test(label)) {
        out[label] = next.textContent.trim();
      }
    }
    return out;
  })()`)) as Record<string, string>;
}

async function readMetric(page: Page, label: string): Promise<string | null> {
  return (await page.evaluate(`(() => {
    const p = Array.from(document.querySelectorAll("p")).find(
      (el) => el.textContent.trim() === ${JSON.stringify(label)}
    );
    return p && p.nextElementSibling ? p.nextElementSibling.textContent.trim() : null;
  })()`)) as string | null;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`\nFAILED: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\nFAILED:", error);
  process.exit(1);
});
