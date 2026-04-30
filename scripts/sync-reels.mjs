#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { kv } from "@vercel/kv";
import { put } from "@vercel/blob";

const COLLECTION_ID = "17979154316722015";
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

// Parse cookies.txt and extract a specific cookie value
function parseCookie(cookiesTxt, name) {
  for (const line of cookiesTxt.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length >= 7 && parts[5] === name) return parts[6]?.trim();
  }
  return null;
}

// Fetch all media codes from the saved collection via Instagram private API
async function getCollectionMediaCodes(cookiesTxt) {
  const sessionid = parseCookie(cookiesTxt, "sessionid");
  const csrftoken = parseCookie(cookiesTxt, "csrftoken");

  if (!sessionid) throw new Error("sessionid not found in cookies — re-export your Instagram cookies");

  const codes = [];
  let nextMaxId = null;

  do {
    const url = new URL(`https://www.instagram.com/api/v1/feed/collection/${COLLECTION_ID}/posts/`);
    url.searchParams.set("count", "50");
    if (nextMaxId) url.searchParams.set("max_id", nextMaxId);

    const res = await fetch(url.toString(), {
      headers: {
        Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
        "X-IG-App-ID": "936619743392459",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Instagram API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    for (const item of data.items ?? []) {
      const code = item.media?.code;
      if (code) codes.push(code);
    }

    nextMaxId = data.more_available ? data.next_max_id : null;
    console.log(`  fetched ${codes.length} items so far...`);
  } while (nextMaxId);

  return codes;
}

async function getExistingIds() {
  const ids = await kv.lrange("reels:index", 0, -1);
  return new Set(ids);
}

async function uploadAndRegister(videoPath, code, existingIds) {
  // Use the shortcode as the ID for deduplication
  if (existingIds.has(code)) {
    console.log(`  skip ${code} (already synced)`);
    return;
  }

  console.log(`  uploading ${code}...`);
  const videoBuffer = readFileSync(videoPath);
  const blob = await put(`reels/${code}.mp4`, videoBuffer, {
    access: "public",
    contentType: "video/mp4",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const reel = {
    id: code,
    blobUrl: blob.url,
    caption: "",
    postedAt: new Date().toISOString(),
    order: Date.now(),
    weight: 2,
    hidden: false,
  };

  // Try to read caption from info json if present
  const infoPath = join(WORK_DIR, `${code}.info.json`);
  try {
    const info = JSON.parse(readFileSync(infoPath, "utf8"));
    reel.caption = info.description ?? info.title ?? "";
    if (info.timestamp) reel.postedAt = new Date(info.timestamp * 1000).toISOString();
  } catch {}

  await kv.set(`reel:${code}`, reel);
  await kv.rpush("reels:index", code);
  console.log(`  registered ${code} → ${blob.url}`);
}

async function main() {
  execSync(`mkdir -p ${WORK_DIR}`);

  const cookiesTxt = process.env.INSTAGRAM_COOKIES;
  const cookiesPath = join(WORK_DIR, "cookies.txt");
  writeFileSync(cookiesPath, cookiesTxt);

  try {
    console.log("Fetching collection from Instagram API...");
    const codes = await getCollectionMediaCodes(cookiesTxt);
    console.log(`Found ${codes.length} reels in collection.`);

    const existingIds = await getExistingIds();
    const newCodes = codes.filter((c) => !existingIds.has(c));
    console.log(`${newCodes.length} new reels to download.`);

    for (const code of newCodes) {
      const reelUrl = `https://www.instagram.com/reel/${code}/`;
      console.log(`Downloading ${code}...`);
      try {
        run(
          `yt-dlp --cookies cookies.txt --no-progress --write-info-json ` +
          `--format "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
          `--output "${code}.%(ext)s" "${reelUrl}"`
        );

        const freshFiles = readdirSync(WORK_DIR);
        const videoFile = freshFiles.find(
          (f) => f.startsWith(code) && [".mp4", ".webm", ".mkv"].includes(extname(f))
        );

        if (videoFile) {
          await uploadAndRegister(join(WORK_DIR, videoFile), code, existingIds);
          existingIds.add(code);
        } else {
          console.error(`  no video file found for ${code}`);
        }
      } catch (err) {
        console.error(`  failed ${code}:`, err.message);
      }
    }

    console.log("Sync complete.");
  } finally {
    try {
      for (const f of readdirSync(WORK_DIR)) unlinkSync(join(WORK_DIR, f));
    } catch {}
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
