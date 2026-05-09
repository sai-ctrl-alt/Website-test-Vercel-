import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, "temporary screenshots");

const puppeteer = require("puppeteer");
const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(p => fs.existsSync(p));

const browser = await puppeteer.launch({ headless: "new", executablePath: chrome, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 20000 });
await page.evaluate(() => {
  document.documentElement.classList.add("js-loaded");
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
});
await new Promise(r => setTimeout(r, 800));

const existing = fs.readdirSync(screenshotDir).filter(f => f.endsWith(".png"));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? "0")).filter(Boolean);
let n = nums.length ? Math.max(...nums) + 1 : 1;

// Problem section - first bg-ivory block
const problemEl = await page.evaluateHandle(() => document.querySelector(".bg-ivory"));
const problemBox = await problemEl.asElement()?.boundingBox();
if (problemBox) {
  const out = path.join(screenshotDir, `screenshot-${n++}-problem.png`);
  await page.screenshot({ path: out, clip: problemBox });
  console.log(`Saved: ${out}`);
}

// Testimonials - second bg-ivory block (after dark results)
const allIvory = await page.$$(".bg-ivory");
if (allIvory.length >= 3) {
  const testiEl = allIvory[2];
  const box = await testiEl.boundingBox();
  if (box) {
    const out = path.join(screenshotDir, `screenshot-${n++}-testimonials.png`);
    await page.screenshot({ path: out, clip: box });
    console.log(`Saved: ${out}`);
  }
}

await browser.close();
