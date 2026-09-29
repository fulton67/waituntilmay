import { put } from "@vercel/blob";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Run with: node --env-file=.env.local scripts/upload-bubbles.mjs  (the token comes from `vercel env pull`)
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Run: node --env-file=.env.local scripts/upload-bubbles.mjs");
  process.exit(1);
}
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DOWNLOADS = "C:/Users/naimj/Downloads";

const FILES = [
  "balloon-print-3750px (8) (1).png",
  "balloon-print-3750px (9) (1).png",
  "balloon-print-3750px (10) (1).png",
  "balloon-print-3750px (12) (1).png",
  "balloon-print-3750px (13) (1).png",
  "balloon-print-3750px (15) (1).png",
  "balloon-print-3750px (18) (1).png",
  "balloon-print-3750px (19) (1).png",
  "balloon-print-3750px (20) (1).png",
  "balloon-print-3750px (21) (1).png",
  "balloon-print-3750px (21) (2).png",
  "balloon-print-3750px (22) (1).png",
  "balloon-print-3750px (23) (1).png",
  "balloon-print-3750px (24) (1).png",
  "balloon-print-3750px (25) (1).png",
  "balloon-print-3750px (26) (1).png",
  "balloon-print-3750px (26) (2).png",
  "balloon-print-3750px (27) (1).png",
  "balloon-print-3750px (30) (1).png",
  "balloon-print-3750px (33) (1).png",
  "balloon-print-3750px (34) (1).png",
  "balloon-print-3750px (35) (1).png",
];

const urls = [];

for (let i = 0; i < FILES.length; i++) {
  const file = FILES[i];
  const fullPath = join(DOWNLOADS, file);
  if (!existsSync(fullPath)) {
    console.warn(`MISSING: ${file}`);
    continue;
  }
  const data = readFileSync(fullPath);
  const blobName = `banking-on-bubbles/${String(i + 1).padStart(2, "0")}.png`;
  console.log(`Uploading ${i + 1}/${FILES.length}: ${blobName}…`);
  const blob = await put(blobName, data, {
    access: "public",
    token: TOKEN,
    allowOverwrite: true,
    contentType: "image/png",
  });
  urls.push(blob.url);
  console.log(`  ✓ ${blob.url}`);
}

console.log("\n\n// PASTE THIS INTO BankingOnBubblesPage.tsx:\nexport const BUBBLE_IMAGES = [");
for (const url of urls) {
  console.log(`  "${url}",`);
}
console.log("];");
