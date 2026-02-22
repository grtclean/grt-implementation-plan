/**
 * fetch-logo.js — Download GRT (GerryTech) official logo
 *
 * Attempts to fetch the logo from gerrytech.com and save it locally
 * so the app doesn't depend on an external URL at runtime.
 *
 * Usage:  node scripts/fetch-logo.js
 */
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const LOGO_URLS = [
  "https://www.gerrytech.com/wp-content/uploads/2021/08/logo.png",
  "https://www.gerrytech.com/wp-content/uploads/2021/08/logo.svg",
];

const OUT_DIR = path.join(__dirname, "..", "client", "public");
const OUT_PNG = path.join(OUT_DIR, "grt-logo.png");

function fetch(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many redirects"));
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 GRT-Logo-Fetcher" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function main() {
  console.log("🔍 Attempting to download GRT logo from gerrytech.com...\n");

  for (const url of LOGO_URLS) {
    try {
      console.log(`  → Trying: ${url}`);
      const buf = await fetch(url);
      if (buf.length < 500) {
        console.log(`  ⚠ Response too small (${buf.length} bytes), likely not a real image. Skipping.`);
        continue;
      }
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(OUT_PNG, buf);
      console.log(`\n✅ Logo saved to client/public/grt-logo.png (${(buf.length / 1024).toFixed(1)} KB)`);
      return;
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
    }
  }

  console.log("\n⚠ Could not auto-download the logo. This is expected if the site blocks scraping.");
  console.log("  → Please manually place the official logo file as: client/public/grt-logo.png");
  console.log("  → The app will use a professional SVG fallback in the meantime.\n");
}

main();
