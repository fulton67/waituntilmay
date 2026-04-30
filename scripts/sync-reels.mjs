#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { kv } from "@vercel/kv";
import { put } from "@vercel/blob";

const COLLECTION_URL = "https://www.instagram.com/waituntilmay/saved/digital-blackness/17979154316722015/";
const WORK_DIR = join(tmpdir(), "image-harvest-sync");

// Fail fast if required env vars are missing
const REQUIRED_ENV = ["INSTAGRAM_COOKIES", "KV_REST_API_URL", "KV_REST_API_TOKEN", "BLOB_READ_WRITE_TOKEN"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: WORK_DIR });
}

async function getExistingIds() {
  const ids = await kv.lrange("reels:index", 0, -1);
  return new Set(ids);
}

async function uploadAndRegister(videoPath, infoPath, existingIds) {
  const info = JSON.parse(readFileSync(infoPath, "utf8"));
  const id = info.id;

  if (existingIds.has(id)) {
    console.log(`  skip ${id} (already synced)`);
    return;
  }

  console.log(`  uploading ${id}...`);
  const videoBuffer = readFileSync(videoPath);
  const blob = await put(`reels/${id}.mp4`, videoBuffer, {
    access: "public",
    contentType: "video/mp4",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const reel = {
    id,
    blobUrl: blob.url,
    caption: info.description ?? info.title ?? "",
    postedAt: info.timestamp ? new Date(info.timestamp * 1000).toISOString() : new Date().toISOString(),
    order: Date.now(),
    weight: 2,
    hidden: false,
  };

  await kv.set(`reel:${id}`, reel);
  await kv.rpush("reels:index", id);
  console.log(`  registered ${id} → ${blob.url}`);
}

async function main() {
  execSync(`mkdir -p ${WORK_DIR}`);

  const cookiesPath = join(WORK_DIR, "cookies.txt");
  writeFileSync(cookiesPath, process.env.INSTAGRAM_COOKIES);

  try {
    console.log("Fetching collection metadata...");
    try {
      run(
        `yt-dlp --cookies cookies.txt --write-info-json --skip-download ` +
        `--no-progress --output "%(id)s.%(ext)s" "${COLLECTION_URL}"`
      );
    } catch (err) {
      console.error("yt-dlp metadata fetch failed:", err.message);
    }

    const existingIds = await getExistingIds();
    const infoFiles = readdirSync(WORK_DIR).filter((f) => f.endsWith(".info.json"));

    for (const infoFile of infoFiles) {
      const id = infoFile.replace(".info.json", "");
      if (existingIds.has(id)) continue;

      console.log(`Downloading new reel ${id}...`);
      try {
        run(
          `yt-dlp --cookies cookies.txt --no-progress ` +
          `--format "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
          `--output "${id}.%(ext)s" "https://www.instagram.com/reel/${id}/"`
        );

        const freshFiles = readdirSync(WORK_DIR);
        const videoFile = freshFiles.find(
          (f) => f.startsWith(id) && [".mp4", ".webm", ".mkv"].includes(extname(f))
        );

        if (videoFile) {
          await uploadAndRegister(
            join(WORK_DIR, videoFile),
            join(WORK_DIR, infoFile),
            existingIds
          );
          existingIds.add(id);
        }
      } catch (err) {
        console.error(`  failed to download ${id}:`, err.message);
      }
    }

    console.log("Sync complete.");
  } finally {
    // Always clean up — ensures cookies.txt is deleted even on error
    try {
      for (const f of readdirSync(WORK_DIR)) unlinkSync(join(WORK_DIR, f));
    } catch {}
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
