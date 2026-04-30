# Plan: Image Harvest 1
Date: 2026-04-30
Goal: Auto-syncing private Instagram reel archive with interactive looping grid on waituntilmay
Architecture: GitHub Actions cron (yt-dlp) → Vercel Blob (video storage) + Vercel KV (metadata/order) → Next.js public grid + admin reorder panel
Tech stack: Next.js 16, React 19, TypeScript, Vercel Blob, Vercel KV, yt-dlp, GitHub Actions

---

## File Map

| File | Role |
|---|---|
| `lib/reels.ts` | Reel type + all KV read/write helpers |
| `app/api/reels/route.ts` | GET ordered list, PATCH order/weight/hidden |
| `app/reels/[name]/page.tsx` | Public server component with visitor tracking |
| `components/ImageHarvest.tsx` | Public looping grid (all audio, hover = louder + bigger) |
| `app/reels/admin/page.tsx` | Admin server component |
| `components/ImageHarvestAdmin.tsx` | Admin grid with drag-reorder, weight cycle, hide toggle |
| `scripts/sync-reels.mjs` | Node.js sync script run by GitHub Actions |
| `.github/workflows/sync-reels.yml` | Cron workflow: every 2h, yt-dlp → Blob → KV |

---

## Tasks

- [ ] Task 1: KV types and helpers (`lib/reels.ts`)
- [ ] Task 2: GET `/api/reels` route
- [ ] Task 3: PATCH `/api/reels` route (order, weight, hidden)
- [ ] Task 4: Public page server component (`app/reels/[name]/page.tsx`)
- [ ] Task 5: `ImageHarvest` client component — grid + video behavior
- [ ] Task 6: Admin page server component (`app/reels/admin/page.tsx`)
- [ ] Task 7: `ImageHarvestAdmin` client component — drag, weight, hide
- [ ] Task 8: Sync script (`scripts/sync-reels.mjs`)
- [ ] Task 9: GitHub Actions workflow (`.github/workflows/sync-reels.yml`)

---

## Task 1: KV types and helpers (`lib/reels.ts`)

Create `waituntilmay/lib/reels.ts`:

```typescript
export interface Reel {
  id: string;
  blobUrl: string;
  caption: string;
  postedAt: string;
  order: number;
  weight: 1 | 2 | 3;
  hidden: boolean;
}

// Returns all reels sorted by order, optionally including hidden ones
export async function getReels(includeHidden = false): Promise<Reel[]> {
  const { kv } = await import("@vercel/kv");
  const ids = (await kv.lrange("reels:index", 0, -1)) as string[];
  if (!ids.length) return [];
  const entries = await Promise.all(ids.map((id) => kv.get<Reel>(`reel:${id}`)));
  const reels = entries.filter((r): r is Reel => r !== null);
  return includeHidden ? reels : reels.filter((r) => !r.hidden);
}

export async function setReelOrder(ids: string[]): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.del("reels:index");
  if (ids.length) await kv.rpush("reels:index", ...ids);
}

export async function updateReel(id: string, patch: Partial<Pick<Reel, "weight" | "hidden">>): Promise<void> {
  const { kv } = await import("@vercel/kv");
  const existing = await kv.get<Reel>(`reel:${id}`);
  if (!existing) return;
  await kv.set(`reel:${id}`, { ...existing, ...patch });
}

export async function appendReel(reel: Reel): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(`reel:${reel.id}`, reel);
  await kv.rpush("reels:index", reel.id);
}
```

**Verify:** TypeScript compiles with no errors.
```bash
cd waituntilmay && npx tsc --noEmit
```
Expected: no output (clean).

---

## Task 2: GET `/api/reels` route

Create `waituntilmay/app/api/reels/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getReels } from "@/lib/reels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  try {
    const reels = await getReels(admin);
    return NextResponse.json(reels);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

**Verify:** With an empty KV (no reels yet), the route returns an empty array.
```bash
curl http://localhost:3000/api/reels
# Expected: []
```

---

## Task 3: PATCH `/api/reels` route (order, weight, hidden)

Add `PATCH` handler to `waituntilmay/app/api/reels/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getReels, setReelOrder, updateReel } from "@/lib/reels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  try {
    const reels = await getReels(admin);
    return NextResponse.json(reels);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as
      | { action: "reorder"; ids: string[] }
      | { action: "update"; id: string; weight?: 1 | 2 | 3; hidden?: boolean };

    if (body.action === "reorder") {
      await setReelOrder(body.ids);
    } else if (body.action === "update") {
      const patch: { weight?: 1 | 2 | 3; hidden?: boolean } = {};
      if (body.weight !== undefined) patch.weight = body.weight;
      if (body.hidden !== undefined) patch.hidden = body.hidden;
      await updateReel(body.id, patch);
    } else {
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

**Verify:** TypeScript compiles clean.
```bash
npx tsc --noEmit
```

---

## Task 4: Public page server component (`app/reels/[name]/page.tsx`)

Create `waituntilmay/app/reels/[name]/page.tsx`:

```typescript
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getReels } from "@/lib/reels";
import ImageHarvest from "@/components/ImageHarvest";

export const metadata: Metadata = {
  title: "image harvest 1",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ReelsPage({ params }: Props) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const hdrs = await headers();
  const ip = hdrs.get("x-real-ip") ?? hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";
  const lang = hdrs.get("accept-language")?.split(",")[0] ?? "unknown";
  const referer = hdrs.get("referer") ?? null;

  try {
    const { kv } = await import("@vercel/kv");
    const id = Date.now().toString();
    const event = { id, type: "page_view", project: "reels", name: decoded, ip, ua, lang, referer, createdAt: new Date().toISOString() };
    await kv.set(`event:${id}`, event);
    await kv.sadd("events", id);
  } catch {}

  const reels = await getReels(false);

  return <ImageHarvest reels={reels} visitorName={decoded} />;
}
```

**Verify:** Page renders without errors (even with empty reels array).
Visit `http://localhost:3000/reels/test` — should show "image harvest 1" page title with empty grid.

---

## Task 5: `ImageHarvest` client component

Create `waituntilmay/components/ImageHarvest.tsx`:

```typescript
"use client";

import { useRef, useCallback } from "react";
import type { Reel } from "@/lib/reels";

interface Props {
  reels: Reel[];
  visitorName: string;
}

function getRotation(id: string): number {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((hash % 9) - 4) * 0.4; // -1.6 to +1.6 degrees
}

function getSpan(weight: 1 | 2 | 3): number {
  return weight === 1 ? 1 : weight === 2 ? 2 : 3;
}

async function downloadReel(url: string, id: string, name: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `image-harvest-${id}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "download", project: "reels", action: "download", name }),
  }).catch(() => {});
}

function ReelCard({ reel, visitorName }: { reel: Reel; visitorName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const span = getSpan(reel.weight);
  const rotation = getRotation(reel.id);

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = 0.8;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = 0.05;
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        gridColumn: `span ${span}`,
        gridRow: `span ${span}`,
        position: "relative",
        transform: `rotate(${rotation}deg)`,
        transition: "transform 200ms ease, z-index 0ms",
        zIndex: 1,
        overflow: "hidden",
        cursor: "pointer",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg) scale(1.15)`;
        (e.currentTarget as HTMLDivElement).style.zIndex = "10";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg) scale(1)`;
        (e.currentTarget as HTMLDivElement).style.zIndex = "1";
      }}
    >
      <video
        ref={videoRef}
        src={reel.blobUrl}
        autoPlay
        loop
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).volume = 0.05; }}
      />
      <button
        onClick={() => downloadReel(reel.blobUrl, reel.id, visitorName)}
        style={{
          position: "absolute",
          bottom: "6px",
          right: "6px",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          border: "none",
          padding: "4px 6px",
          fontSize: "11px",
          fontFamily: "inherit",
          cursor: "pointer",
          opacity: 0,
          transition: "opacity 150ms",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0"; }}
      >
        ↓
      </button>
    </div>
  );
}

export default function ImageHarvest({ reels, visitorName }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "0" }}>
      <div style={{
        padding: "8px 12px",
        color: "#fff",
        fontSize: "11px",
        fontFamily: "inherit",
        letterSpacing: "0.05em",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        mixBlendMode: "difference",
      }}>
        image harvest 1
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gridAutoRows: "15vw",
        gridAutoFlow: "dense",
        gap: 0,
      }}>
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} visitorName={visitorName} />
        ))}
      </div>
    </div>
  );
}
```

**Verify:** Visit `/reels/test` with at least one reel in KV. Videos should autoplay and audio should be quiet (0.05). Hovering a video: scale up + louder audio. Download arrow visible on hover.

---

## Task 6: Admin page server component (`app/reels/admin/page.tsx`)

Create `waituntilmay/app/reels/admin/page.tsx`:

```typescript
import type { Metadata } from "next";
import { getReels } from "@/lib/reels";
import ImageHarvestAdmin from "@/components/ImageHarvestAdmin";

export const metadata: Metadata = {
  title: "image harvest 1 — admin",
  robots: { index: false, follow: false },
};

export default async function ReelsAdminPage() {
  const reels = await getReels(true);
  return <ImageHarvestAdmin reels={reels} />;
}
```

---

## Task 7: `ImageHarvestAdmin` client component

Create `waituntilmay/components/ImageHarvestAdmin.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import type { Reel } from "@/lib/reels";

interface Props {
  reels: Reel[];
}

function getRotation(id: string): number {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((hash % 9) - 4) * 0.4;
}

function getSpan(weight: 1 | 2 | 3): number {
  return weight === 1 ? 1 : weight === 2 ? 2 : 3;
}

async function patchReels(body: object) {
  await fetch("/api/reels", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function ImageHarvestAdmin({ reels: initial }: Props) {
  const [reels, setReels] = useState<Reel[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragId = useRef<string | null>(null);

  const cycleWeight = useCallback(async (id: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = r.weight === 1 ? 2 : r.weight === 2 ? 3 : 1;
        return { ...r, weight: next as 1 | 2 | 3 };
      })
    );
    const reel = reels.find((r) => r.id === id);
    if (!reel) return;
    const next = reel.weight === 1 ? 2 : reel.weight === 2 ? 3 : 1;
    await patchReels({ action: "update", id, weight: next });
  }, [reels]);

  const toggleHidden = useCallback(async (id: string) => {
    setReels((prev) =>
      prev.map((r) => r.id === id ? { ...r, hidden: !r.hidden } : r)
    );
    const reel = reels.find((r) => r.id === id);
    if (!reel) return;
    await patchReels({ action: "update", id, hidden: !reel.hidden });
  }, [reels]);

  const saveOrder = useCallback(async () => {
    setSaving(true);
    await patchReels({ action: "reorder", ids: reels.map((r) => r.id) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [reels]);

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id;
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return;
    setReels((prev) => {
      const from = prev.findIndex((r) => r.id === dragId.current);
      const to = prev.findIndex((r) => r.id === targetId);
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    dragId.current = null;
  }, []);

  const weightLabel = (w: 1 | 2 | 3) => w === 1 ? "S" : w === 2 ? "M" : "L";

  return (
    <div style={{ minHeight: "100vh", background: "#111", padding: "0" }}>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#111", borderBottom: "1px solid #333",
        display: "flex", alignItems: "center", gap: "12px",
        padding: "8px 12px",
      }}>
        <span style={{ color: "#fff", fontSize: "11px", fontFamily: "inherit" }}>
          image harvest 1 — admin
        </span>
        <button
          onClick={saveOrder}
          disabled={saving}
          style={{
            background: saved ? "#0a0" : "#fff", color: saved ? "#fff" : "#000",
            border: "none", padding: "4px 10px", fontSize: "11px",
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          {saving ? "saving..." : saved ? "saved" : "save order"}
        </button>
      </div>

      <div style={{
        paddingTop: "36px",
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gridAutoRows: "15vw",
        gridAutoFlow: "dense",
        gap: 0,
      }}>
        {reels.map((reel) => {
          const span = getSpan(reel.weight);
          const rotation = getRotation(reel.id);
          return (
            <div
              key={reel.id}
              draggable
              onDragStart={() => handleDragStart(reel.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(reel.id)}
              style={{
                gridColumn: `span ${span}`,
                gridRow: `span ${span}`,
                position: "relative",
                transform: `rotate(${rotation}deg)`,
                opacity: reel.hidden ? 0.35 : 1,
                cursor: "grab",
                overflow: "hidden",
              }}
            >
              <video
                src={reel.blobUrl}
                autoPlay
                loop
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                display: "flex", flexDirection: "column",
                justifyContent: "space-between", padding: "4px",
              }}>
                <button
                  onClick={() => toggleHidden(reel.id)}
                  style={{
                    alignSelf: "flex-end", background: "rgba(0,0,0,0.7)",
                    color: "#fff", border: "none", fontSize: "10px",
                    fontFamily: "inherit", cursor: "pointer", padding: "2px 5px",
                  }}
                >
                  {reel.hidden ? "show" : "hide"}
                </button>
                <button
                  onClick={() => cycleWeight(reel.id)}
                  style={{
                    alignSelf: "flex-start", background: "rgba(0,0,0,0.7)",
                    color: "#fff", border: "none", fontSize: "10px",
                    fontFamily: "inherit", cursor: "pointer", padding: "2px 5px",
                  }}
                >
                  {weightLabel(reel.weight)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Verify:** Visit `/reels/admin`. Drag cards to reorder → click "save order" → refresh page, order persists. Click "S/M/L" button cycles size instantly. Click "hide" dims the card.

---

## Task 8: Sync script (`scripts/sync-reels.mjs`)

Create `waituntilmay/scripts/sync-reels.mjs`:

```javascript
#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { createKV } from "@vercel/kv";
import { put } from "@vercel/blob";

const COLLECTION_URL = "https://www.instagram.com/waituntilmay/saved/digital-blackness/17979154316722015/";
const WORK_DIR = join(tmpdir(), "image-harvest-sync");

const kv = createKV({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

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

  // Write cookies file
  const cookiesPath = join(WORK_DIR, "cookies.txt");
  require("fs").writeFileSync(cookiesPath, process.env.INSTAGRAM_COOKIES);

  // Download info JSONs (no video yet — fast pass to get IDs)
  console.log("Fetching collection metadata...");
  try {
    run(
      `yt-dlp --cookies cookies.txt --write-info-json --skip-download ` +
      `--no-progress --output "%(id)s.%(ext)s" "${COLLECTION_URL}"`
    );
  } catch {}

  const existingIds = await getExistingIds();
  const files = readdirSync(WORK_DIR);
  const infoFiles = files.filter((f) => f.endsWith(".info.json"));

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

      const videoFile = files.concat(readdirSync(WORK_DIR)).find(
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

  // Cleanup
  for (const f of readdirSync(WORK_DIR)) {
    if (f !== "cookies.txt") unlinkSync(join(WORK_DIR, f));
  }
  unlinkSync(cookiesPath);

  console.log("Sync complete.");
}

main().catch((err) => { console.error(err); process.exit(1); });
```

**Verify locally (dry run):**
```bash
KV_REST_API_URL=xxx KV_REST_API_TOKEN=xxx BLOB_READ_WRITE_TOKEN=xxx \
INSTAGRAM_COOKIES="$(cat ~/cookies.txt)" \
node waituntilmay/scripts/sync-reels.mjs
```
Expected: prints "Fetching collection metadata..." then lists reels found.

---

## Task 9: GitHub Actions workflow

Create `waituntilmay/.github/workflows/sync-reels.yml`:

```yaml
name: Sync Image Harvest Reels

on:
  schedule:
    - cron: "0 */2 * * *"   # every 2 hours
  workflow_dispatch:          # manual trigger from GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: waituntilmay

    steps:
      - uses: actions/checkout@v4

      - name: Install yt-dlp
        run: |
          sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
          sudo chmod a+rx /usr/local/bin/yt-dlp
          yt-dlp --version

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: waituntilmay/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run sync
        env:
          INSTAGRAM_COOKIES: ${{ secrets.INSTAGRAM_COOKIES }}
          KV_REST_API_URL: ${{ secrets.KV_REST_API_URL }}
          KV_REST_API_TOKEN: ${{ secrets.KV_REST_API_TOKEN }}
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
        run: node scripts/sync-reels.mjs
```

**After creating this file:**

Push to GitHub, then go to **Settings → Secrets → Actions** and add:
- `INSTAGRAM_COOKIES` — export from your browser: in Chrome DevTools → Application → Cookies → Export as cookies.txt (use the EditThisCookie extension or `yt-dlp --cookies-from-browser chrome` locally to generate it)
- `KV_REST_API_URL` — from Vercel dashboard → Storage → KV → .env.local tab
- `KV_REST_API_TOKEN` — same location
- `BLOB_READ_WRITE_TOKEN` — from Vercel dashboard → Storage → Blob → .env.local tab

**Trigger manually to test:** GitHub → Actions → "Sync Image Harvest Reels" → Run workflow.

---

## Setup Checklist (one-time, done by you)

- [ ] Export Instagram cookies: install [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) Chrome extension → visit instagram.com while logged in → export → copy contents into GitHub Secret `INSTAGRAM_COOKIES`
- [ ] Add all 4 GitHub Secrets (see Task 9)
- [ ] Push repo to GitHub (workflow only runs on GitHub)
- [ ] Run workflow manually once to verify sync works
- [ ] Visit `/reels/yourname` to see the grid
- [ ] Visit `/reels/admin` to reorder and resize

---

## Self-Review

- [x] All spec requirements map to tasks (privacy/noindex → T4+T6, auto-sync → T8+T9, grid UI → T5, admin → T7, download → T5, visitor tracking → T4)
- [x] No TBD or placeholder language
- [x] Types consistent across all tasks (`Reel` interface used everywhere)
- [x] KV helpers centralized in `lib/reels.ts`, not duplicated
