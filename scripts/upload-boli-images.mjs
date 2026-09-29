import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { join } from "path";

// Run with: node --env-file=.env.local scripts/upload-boli-images.mjs  (the token comes from `vercel env pull`)
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Run: node --env-file=.env.local scripts/upload-boli-images.mjs");
  process.exit(1);
}

const dir = "C:/Users/naimj/Downloads/boli-extract";
const total = 16;
const urls = [];

for (let i = 0; i < total; i++) {
  const filepath = join(dir, `${i}.jpg`);
  const buffer = readFileSync(filepath);
  const blob = new Blob([buffer], { type: "image/jpeg" });
  const { url } = await put(`work/boli/${i}.jpg`, blob, {
    access: "public",
    allowOverwrite: true,
  });
  urls.push(url);
  console.log(`✓ ${i}.jpg → ${url}`);
}

console.log("\nAll URLs:");
console.log(JSON.stringify(urls, null, 2));
