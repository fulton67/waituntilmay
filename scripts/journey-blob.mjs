/**
 * Shared Blob helpers for the journey pool.
 *
 * The manifest lives on Blob rather than in the bundle so a new version shows
 * up for everyone the moment it is uploaded, with no deploy. The copy in
 * public/journey/manifest.json stays as the fallback the player uses when
 * Blob cannot be reached, so the piece never goes dark because of a CDN.
 *
 * The manifest is written with a short max-age: it changes nightly, while the
 * videos it points at never change once written.
 */
import { put, list } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";

export const MANIFEST_MAX_AGE = 60;      // seconds; the videos get a year
export const VIDEO_MAX_AGE = 31536000;

export function requireToken(dryRun = false) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token && !dryRun) {
    console.error("BLOB_READ_WRITE_TOKEN is not set.\n"
      + "  npx vercel env pull .env.local --environment=production\n"
      + "  node --env-file=.env.local <script>");
    process.exit(1);
  }
  return token;
}

/** The manifest's public URL, or null if it has never been written. */
export async function manifestUrl(prefix, token) {
  const { blobs } = await list({ prefix: `${prefix}/manifest.json`, token });
  const hit = blobs.find((b) => b.pathname === `${prefix}/manifest.json`);
  return hit ? hit.url : null;
}

/** Read the live manifest from Blob. Returns null when there is not one yet. */
export async function readManifest(prefix, token) {
  const url = await manifestUrl(prefix, token);
  if (!url) return null;
  // the manifest is cached at the edge, so ask past it
  const r = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export async function writeManifest(prefix, files, token, extra = {}) {
  const body = JSON.stringify({
    files, count: files.length, seconds_each: 30.0,
    updated: new Date().toISOString(), ...extra,
  }, null, 1);
  const { url } = await put(`${prefix}/manifest.json`, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: MANIFEST_MAX_AGE,
    token,
  });
  return url;
}

/** Upload one render. Returns its public URL. */
export async function uploadRender(srcDir, name, prefix, token) {
  const body = await readFile(path.join(srcDir, name));
  const { url } = await put(`${prefix}/${name}`, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: false,          // stable URLs across re-uploads
    allowOverwrite: true,
    cacheControlMaxAge: VIDEO_MAX_AGE,
    token,
  });
  return url;
}

export const mb = (p) => statSync(p).size / 1e6;
