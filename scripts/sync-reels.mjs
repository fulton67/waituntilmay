#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
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

// Get reel shortcodes from collection using Instagram's web GraphQL endpoint
async function getCollectionShortcodes(cookiesTxt) {
  const sessionid = parseCookie(cookiesTxt, "sessionid");
  const csrftoken = parseCookie(cookiesTxt, "csrftoken");
  const dsUserId = parseCookie(cookiesTxt, "ds_user_id");

  if (!sessionid) throw new Error("sessionid not found in cookies");

  const codes = [];
  let after = null;

  do {
    const variables = JSON.stringify({
      collection_id: COLLECTION_ID,
      first: 50,
      ...(after ? { after } : {}),
    });

    const url = `https://www.instagram.com/graphql/query/?query_hash=e04f8f20f702c6c8e3d26f2f1e86d65e&variables=${encodeURIComponent(variables)}`;

    const res = await fetch(url, {
      headers: {
        "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken}; ds_user_id=${dsUserId}`,
        "X-CSRFToken": csrftoken ?? "",
        "X-IG-App-ID": "936619743392459",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/",
        "Origin": "https://www.instagram.com",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GraphQL error ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const edges = data?.data?.collection_media?.edges ?? [];
    for (const edge of edges) {
      const code = edge?.node?.shortcode;
      if (code) codes.push(code);
    }

    const pageInfo = data?.data?.collection_media?.page_info;
    after = pageInfo?.has_next_page ? pageInfo.end_cursor : null;
    console.log(`  fetched ${codes.length} items...`);
  } while (after);

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

  // Enrich with info json if available
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
  writeFileSync(join(WORK_DIR, "cookies.txt"), cookiesTxt);

  try {
    console.log("Fetching collection from Instagram GraphQL...");
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
