#!/usr/bin/env node
import { fromPath } from "pdf2pic";
import { put } from "@vercel/blob";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PDF_PATH = "C:\\Users\\naimj\\Downloads\\Boli probrane (1).pdf";
const OUT_DIR = join(tmpdir(), "pdf-slides");
mkdirSync(OUT_DIR, { recursive: true });

// slides 1-3 = boli, 4-7 = pobrane, 8 = boli main, 9 = crowd
const SLIDES = {
  boli:    [1, 2, 3],
  pobrane: [4, 5, 6],
  both:    [],
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
  const allSlides = [1,2,3,4,5,6];
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
