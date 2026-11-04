import type { MotionRef, VisRef } from "../_lib/types";
import type { Pick } from "./useGold";

export type GoldFile = {
  exported: string;
  count: number;
  picks: (
    | {
        kind: "image"; id: string; procedure_id: string; procedure: string; image_url: string; page_url: string; preview: string;
        type: string; labelled: boolean; source: string; license: string; style: string; note: string; picked: string;
      }
    | {
        kind: "motion"; id: string; procedure_id: string; procedure: string; url: string; title: string; maker: string;
        best_s: number; style: string; what: string; note: string; picked: string;
      }
  )[];
};

export function buildPicks(gold: Record<string, Pick>, refs: VisRef[], motion: MotionRef[], pname: Record<string, string>): GoldFile {
  const img = new Map(refs.map((r) => [r.id, r]));
  const mot = new Map(motion.map((m) => [m.id, m]));
  const picks: GoldFile["picks"] = [];
  for (const [k, g] of Object.entries(gold).sort((a, b) => a[1].at - b[1].at)) {
    const [kind, id] = [k.slice(0, 3), k.slice(4)];
    const picked = new Date(g.at).toISOString();
    if (kind === "img" && img.has(id)) {
      const r = img.get(id)!;
      picks.push({
        kind: "image", id, procedure_id: r.p, procedure: pname[r.p] ?? r.p, image_url: r.u, page_url: r.pg, preview: r.f,
        type: r.t, labelled: r.lab, source: r.src, license: r.lic, style: r.sn, note: g.note, picked,
      });
    } else if (kind === "mot" && mot.has(id)) {
      const m = mot.get(id)!;
      picks.push({
        kind: "motion", id, procedure_id: m.p, procedure: pname[m.p] ?? m.p, url: `https://www.youtube.com/watch?v=${m.id}&t=${m.best}s`,
        title: m.t, maker: m.ch, best_s: m.best, style: m.st, what: m.what, note: g.note, picked,
      });
    }
  }
  return { exported: new Date().toISOString(), count: picks.length, picks };
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function exportJSON(file: GoldFile) {
  download(new Blob([JSON.stringify(file, null, 1)], { type: "application/json" }), "gold_picks.json");
}

async function fetchBlob(url: string, ms = 10000): Promise<Blob | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { mode: "cors", signal: ctl.signal, referrerPolicy: "no-referrer" });
    if (!r.ok) return null;
    const b = await r.blob();
    return b.size > 0 && /^image\//.test(b.type || "image/") ? b : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const extOf = (url: string, type: string) =>
  (type.split("/")[1] || url.split("?")[0].split(".").pop() || "jpg").replace("jpeg", "jpg").replace("svg+xml", "svg").slice(0, 4);

/**
 * Zip the picked images in the browser. Originals come through /api/ostad-refimg (most hosts block cross-origin reads);
 * the 600 px copy served by this site is the fallback, and the manifest says which one each file is. Motion picks add a thumbnail where
 * YouTube allows it; their videos stay links in the manifest.
 */
export async function exportZip(file: GoldFile, onProgress: (done: number, total: number) => void) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const log: { id: string; file: string | null; from: "original" | "preview" | "thumbnail" | "missing" }[] = [];
  let done = 0;
  const queue = [...file.picks];
  const work = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      if (p.kind === "image") {
        // the original via this site's server (hosts block browser reads), then direct, then the 600 px copy
        let blob = (await fetchBlob(`/api/ostad-refimg?id=${encodeURIComponent(p.id)}`, 20000)) ?? (await fetchBlob(p.image_url));
        let from: "original" | "preview" = "original";
        if (!blob) {
          blob = await fetchBlob(p.preview);
          from = "preview";
        }
        const name = blob ? `${p.procedure_id}/${p.id}${from === "preview" ? "_600" : ""}.${extOf(from === "preview" ? p.preview : p.image_url, blob.type)}` : null;
        if (blob && name) zip.file(name, blob);
        log.push({ id: p.id, file: name, from: blob ? from : "missing" });
      } else {
        const blob = await fetchBlob(`https://i.ytimg.com/vi/${p.id}/hqdefault.jpg`);
        const name = blob ? `${p.procedure_id}/motion_${p.id}.jpg` : null;
        if (blob && name) zip.file(name, blob);
        log.push({ id: p.id, file: name, from: blob ? "thumbnail" : "missing" });
      }
      onProgress(++done, file.picks.length);
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  zip.file("gold_picks.json", JSON.stringify({ ...file, files: log }, null, 1));
  const blob = await zip.generateAsync({ type: "blob" });
  download(blob, "gold_picks.zip");
  return log;
}
