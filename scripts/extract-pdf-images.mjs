#!/usr/bin/env node
import { fromPath } from "pdf2pic";
import { put } from "@vercel/blob";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PDF_PATH = "C:\\Users\\naimj\\Downloads\\Boli probrane (1).pdf";
const OUT_DIR = join(tmpdir(), "pdf-slides");
mkdirSync(OUT_DIR, { recursive: true });

// slide 7 = pobrane, slide 8 = boli, slide 9 = crowd (both)
const SLIDES = {
  pobrane: [7],
  boli:    [8],
  both:    [9],
};

const convert = fromPath(PDF_PATH, {
  density: 200,
  saveFilename: "slide",
  savePath: OUT_DIR,
  format: "jpg",
  width: 1800,
  height: 1200,
});

async function main() {
  const allSlides = [...new Set(Object.values(SLIDES).flat())].sort((a,b)=>a-b);
  console.log(`Converting slides: ${allSlides.join(", ")}...`);

  const urls = {};

  for (const slideNum of allSlides) {
    console.log(`  Converting slide ${slideNum}...`);
    const result = await convert(slideNum, { responseType: "buffer" });
    const buffer = result.buffer ?? readFileSync(result.path);

    const blobPath = `work/slides/slide-${slideNum}.jpg`;
    console.log(`  Uploading to blob: ${blobPath}`);
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "image/jpeg",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });
    urls[slideNum] = blob.url;
    console.log(`  → ${blob.url}`);
  }

  console.log("\n\nURL map:");
  console.log(JSON.stringify(urls, null, 2));
  console.log("\nPobrane images:", SLIDES.pobrane.map(n => urls[n]));
  console.log("Boli images:   ", SLIDES.boli.map(n => urls[n]));
  console.log("Crowd images:  ", SLIDES.both.map(n => urls[n]));
}

main().catch(e => { console.error(e); process.exit(1); });
