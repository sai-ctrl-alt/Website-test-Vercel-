import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, "temporary screenshots");

if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] ? `-${process.argv[3]}` : "";

const existing = fs.readdirSync(screenshotDir).filter(f => f.endsWith(".png"));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? "0")).filter(Boolean);
const next = nums.length ? Math.max(...nums) + 1 : 1;
const outFile = path.join(screenshotDir, `screenshot-${next}${label}.png`);

try {
  const puppeteer = require("puppeteer");
  const executablePath = puppeteer.executablePath?.() || null;

  const chrome = [
    executablePath,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find(p => p && fs.existsSync(p));

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: chrome || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });

  // Reveal all scroll-animated elements
  await page.evaluate(() => {
    document.documentElement.classList.add("js-loaded");
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
  });

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: outFile, fullPage: true });
  await browser.close();
  console.log(`Saved: ${outFile}`);
} catch (e) {
  console.error("Puppeteer failed:", e.message);
  // fallback to Chrome headless CLI
  const chrome = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find(p => fs.existsSync(p));
  if (chrome) {
    spawnSync(chrome, [
      "--headless=new", "--disable-gpu", "--no-sandbox",
      `--screenshot=${outFile}`, "--window-size=1440,900",
      "--force-device-scale-factor=2", url,
    ], { stdio: "pipe" });
    console.log(`Saved (fallback): ${outFile}`);
  } else {
    console.error("No screenshot tool available");
    process.exit(1);
  }
}
