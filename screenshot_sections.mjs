import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, "temporary screenshots");

const puppeteer = require("puppeteer");

const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(p => fs.existsSync(p));

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: chrome || undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 20000 });
await page.evaluate(() => {
  document.documentElement.classList.add("js-loaded");
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
});
await new Promise(r => setTimeout(r, 800));

const sections = [
  { selector: ".proof-bar", name: "proofbar" },
  { selector: "#problem .section", name: "problem" },
  { selector: ".layers-wrap", name: "system" },
  { selector: "#how-it-works .section", name: "steps" },
  { selector: ".dark-results", name: "results" },
  { selector: ".cta-section", name: "cta" },
  { selector: "footer", name: "footer" },
];

const existing = fs.readdirSync(screenshotDir).filter(f => f.endsWith(".png"));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? "0")).filter(Boolean);
let n = nums.length ? Math.max(...nums) + 1 : 1;

for (const { selector, name } of sections) {
  const el = await page.$(selector);
  if (!el) { console.log(`Missing: ${selector}`); continue; }
  const out = path.join(screenshotDir, `screenshot-${n++}-${name}.png`);
  await el.screenshot({ path: out });
  console.log(`Saved: ${out}`);
}

await browser.close();
