# Image Harvest 1 — Design Spec
**Date:** 2026-04-30  
**Project:** waituntilmay (Next.js 16, Vercel)  
**Feature:** Auto-syncing private Instagram reel archive with interactive grid UI

---

## Overview

"Image Harvest 1" is a private, link-only page on waituntilmay that archives Instagram reels from the saved collection "digital-blackness" (ID: `17979154316722015`). Videos auto-sync every 2 hours via GitHub Actions. The page is a dense, chaotic looping grid where all videos play simultaneously — quiet until hovered.

---

## Privacy Model

- **Not password protected** — link-only (security through obscurity)
- `robots: { index: false, follow: false }` on all reels routes
- No links to `/reels/*` from anywhere on the main site
- Public page URL: `/reels/[name]` (name param used for visitor tracking, same pattern as essdee/lunch-bells)
- Admin URL: `/reels/admin`

---

## System Architecture

```
Instagram Saved Collection "digital-blackness"
  ID: 17979154316722015
        ↓
  GitHub Actions (cron every 2 hours)
  - yt-dlp authenticated via INSTAGRAM_COOKIES secret (cookies.txt format)
  - Script checks KV for already-synced video IDs
  - Downloads only new videos (no watermark — original source)
  - Uploads each video to Vercel Blob
  - Writes metadata entry to Vercel KV
        ↓
  Vercel KV (metadata store)
  - Key: reels:index → sorted list of video IDs (defines display order)
  - Key: reel:{id} → { id, blobUrl, caption, postedAt, order, weight, hidden }
        ↓
  waituntilmay /reels routes
  - /reels/[name]   — public archive page (noindex)
  - /reels/admin    — admin reorder/resize panel (noindex)
```

---

## GitHub Actions Sync Pipeline

**Trigger:** Cron every 2 hours (`0 */2 * * *`)  
**Runner:** ubuntu-latest

**Steps:**
1. Write `INSTAGRAM_COOKIES` secret to `cookies.txt`
2. Run `yt-dlp` against the saved collection URL with `--cookies cookies.txt`
3. For each downloaded video, check KV for existing entry by Instagram video ID
4. If new: upload to Vercel Blob, write KV entry with default `weight: 2`, `order: append to end`, `hidden: false`
5. Clean up temp files

**GitHub Secrets required:**
- `INSTAGRAM_COOKIES` — browser-exported cookies.txt contents
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`  
- `BLOB_READ_WRITE_TOKEN`

**KV schema per video:**
```json
{
  "id": "instagram_video_id",
  "blobUrl": "https://xxx.public.blob.vercel-storage.com/...",
  "caption": "original caption text",
  "postedAt": "2026-01-15T10:30:00Z",
  "order": 3,
  "weight": 2,
  "hidden": false
}
```
Weight: `1` = small, `2` = medium (default), `3` = large

---

## Public Page: `/reels/[name]`

**Aesthetic reference:** maxbo.me/cursors, caccioppoli.com — dense, chaotic, web-collage energy  
**Page title:** "image harvest 1"  
**Font:** Courier New (matches site global style)

### Grid
- CSS grid with no strict rows/columns — irregular, organic feel
- Video size driven by `weight`: weight 1 = 1 grid unit, weight 2 = 1.5 units, weight 3 = 2 units
- Slight random rotation per video (-2deg to +2deg, seeded by video ID so consistent across renders)
- No gaps — dense packing

### Video Behavior
- All videos: `autoPlay`, `loop`, `muted` attribute removed — audio plays at volume `0.05`
- All videos start playing on page load simultaneously
- On hover:
  - Scale: `1.15x` (CSS transform, smooth 200ms transition)
  - Volume: ramps to `0.8`
  - z-index elevated so it overlaps neighbors
  - Download icon fades in (bottom-right corner)
- On hover exit: scale and volume return smoothly

### Download
- Clicking download icon triggers direct Blob URL download
- Logs download event to KV (same pattern as essdee/lunch-bells)

### Visitor Tracking
- `/reels/[name]` captures IP, UA, language, referer, name param → KV event (same pattern as existing routes)

---

## Admin Panel: `/reels/admin`

- Same grid layout as public page
- Drag-and-drop reorder (using native HTML5 drag API or a lightweight lib)
- Click video to cycle weight: `1 → 2 → 3 → 1` (visual size changes immediately)
- Toggle button to hide/show a video (sets `hidden: true` in KV, removes from public page)
- "Save order" persists new order array to KV `reels:index`
- No auth beyond the URL — link-only private

---

## Routes Summary

| Route | File | Privacy |
|---|---|---|
| `/reels/[name]` | `app/reels/[name]/page.tsx` | noindex, link-only |
| `/reels/admin` | `app/reels/admin/page.tsx` | noindex, link-only |
| `/api/reels` | GET list, PATCH order/weight/hidden | internal |

---

## Out of Scope

- Automatic size weight assignment (manual only via admin)
- Authentication/password for the reels page
- Re-encoding or transcoding videos
- Comments or reactions on videos
