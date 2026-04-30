#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { kv } from "@vercel/kv";
import { put } from "@vercel/blob";

const COLLECTION_ID = "17979154316722015";
const WORK_DIR = join(tmpdir(), "image-harvest-sync");

const REQUIRED_ENV = ["INSTAGRAM_COOKIES", "KV_REST_API_URL", "KV_REST_API_TOKEN", "BLOB_READ_WRITE_TOKEN"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) { console.error(`Missing required env var: ${key}`); process.exit(1); }
}

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: WORK_DIR, ...opts });
}

function parseCookie(cookiesTxt, name) {
  for (const line of cookiesTxt.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length >= 7 && parts[5] === name) return parts[6]?.trim();
  }
  return null;
}

async function getCollectionShortcodes(cookiesTxt) {
  const sessionid = parseCookie(cookiesTxt, "sessionid");
  const csrftoken = parseCookie(cookiesTxt, "csrftoken");
  const dsUserId = parseCookie(cookiesTxt, "ds_user_id");

  if (!sessionid) throw new Error("sessionid not found in cookies");

  const codes = [];
  let nextMaxId = null;

  do {
    const url = new URL(`https://i.instagram.com/api/v1/feed/collection/${COLLECTION_ID}/posts/`);
    url.searchParams.set("count", "50");
    if (nextMaxId) url.searchParams.set("max_id", nextMaxId);

    const res = await fetch(url.toString(), {
      headers: {
        "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken ?? ""}; ds_user_id=${dsUserId ?? ""}`,
        "X-CSRFToken": csrftoken ?? "",
        "X-IG-App-ID": "567067343352427",
        "X-IG-Capabilities": "3brTvw==",
        "X-IG-Connection-Type": "WIFI",
        "User-Agent": "Instagram 219.0.0.12.117 Android (26/8.0.0; 480dpi; 1080x1920; OnePlus; 6T; OnePlus6T; qcom; en_US; 314665256)",
        "Accept": "*/*",
        "Accept-Language": "en-US",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Instagram API error ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    for (const item of data.items ?? []) {
      const code = item.media?.code ?? item.code;
      if (code) codes.push(code);
    }

    nextMaxId = data.more_available ? data.next_max_id : null;
    console.log(`  fetched ${codes.length} items...`);
  } while (nextMaxId);

  return codes;
}

async function getExistingIds() {
  const ids = await kv.lrange("reels:index", 0, -1);
  return new Set(ids);
}

async function uploadAndRegister(videoPath, code, existingIds) {
  if (existingIds.has(code)) { console.log(`  skip ${code}`); return; }

  console.log(`  uploading ${code}...`);
  const videoBuffer = readFileSync(videoPath);
  const blob = await put(`reels/${code}.mp4`, videoBuffer, {
    access: "public",
    contentType: "video/mp4",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const reel = { id: code, blobUrl: blob.url, caption: "", postedAt: new Date().toISOString(), order: Date.now(), weight: 2, hidden: false };

  try {
    const info = JSON.parse(readFileSync(join(WORK_DIR, `${code}.info.json`), "utf8"));
    reel.caption = info.description ?? info.title ?? "";
    if (info.timestamp) reel.postedAt = new Date(info.timestamp * 1000).toISOString();
  } catch {}

  await kv.set(`reel:${code}`, reel);
  await kv.rpush("reels:index", code);
  console.log(`  registered ${code} → ${blob.url}`);
}

async function main() {
  try { mkdirSync(WORK_DIR, { recursive: true }); } catch {}

  const cookiesTxt = process.env.INSTAGRAM_COOKIES;
  const cookiesFile = join(WORK_DIR, "cookies.txt");
  writeFileSync(cookiesFile, cookiesTxt);

  try {
    console.log("Fetching collection from Instagram API...");
    const codes = await getCollectionShortcodes(cookiesTxt);
    console.log(`Found ${codes.length} reels in collection.`);

    if (codes.length === 0) {
      console.log("No reels found — cookies may be expired or collection is empty.");
      return;
    }

    const existingIds = await getExistingIds();
    const newCodes = codes.filter((c) => !existingIds.has(c));
    console.log(`${newCodes.length} new reels to download.`);

    for (const code of newCodes) {
      console.log(`Downloading ${code}...`);
      try {
        run(
          `yt-dlp --cookies cookies.txt --no-progress --write-info-json ` +
          `--format "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
          `--output "${code}.%(ext)s" "https://www.instagram.com/reel/${code}/"`
        );

        const videoFile = readdirSync(WORK_DIR).find(
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
    try { for (const f of readdirSync(WORK_DIR)) unlinkSync(join(WORK_DIR, f)); } catch {}
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
