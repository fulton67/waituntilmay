"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { useFadeIn } from "@/lib/useFadeIn";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

// ── Shared book constants ─────────────────────────────────────────────────────

const TEXTURE_URL = "https://d2w9rnfcy7mm78.cloudfront.net/8424147/original_545e5e9598db3920be3e81593d502120.jpg";
const CREST_URL   = "https://d2w9rnfcy7mm78.cloudfront.net/45960173/original_ca1280adc59a5fb17a12589ee119d422.png";

// ── Tasks ─────────────────────────────────────────────────────────────────────

const TASKS = [
  { id: "buckets",      label: "set up mop buckets",            detail: "grab the squeeze combo from the mop sink — put one in, split between two buckets", link: "https://www.bakedeco.com/detail.asp?id=9834", linkLabel: "squeeze combo →" },
  { id: "cambro",       label: "fill medium cambro with dish soap", detail: "fill from the sink — bring to the front sink station with a bus bin and dirty cup rack" },
  { id: "white-towels", label: "white towels near the oven",    detail: "place them where cooks will be working" },
  { id: "sani-buckets", label: "brown towels + sani buckets",   detail: "brown towels in yellow bucket. red bucket = sani. both go under back sink AND under front sink" },
  { id: "windows",      label: "clean all windows",             detail: "warm soapy water in blue bucket + squeeze combo (next to mop sink). dry with microfiber — towels are in black containers with yellow rim, back of basement" },
  { id: "counters",     label: "spray down counters",           detail: "use the yellow cleaner next to the chef sink" },
  { id: "walk",         label: "walk the space",                detail: "look for what can be improved. the restaurant is a gallery. there is always something dirty — clean it" },
];
const TASK_IDS = TASKS.map(t => t.id);

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "foood-shift-v2";
const TODAY_KEY   = () => new Date().toISOString().slice(0, 10);

interface JournalEntry {
  id: string;
  time: string;       // "9:14 AM"
  date: string;       // "2026-05-09"
  note?: string;
  photoUrl?: string;
}

interface ShiftData {
  date: string;
  checked: string[];
  entries: JournalEntry[];
}

function loadData(): ShiftData {
  if (typeof window === "undefined") return { date: TODAY_KEY(), checked: [], entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p: ShiftData = JSON.parse(raw);
      if (p.date === TODAY_KEY()) return p;
    }
  } catch {}
  return { date: TODAY_KEY(), checked: [], entries: [] };
}

function saveData(d: ShiftData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

// ── Book paper components — same system as harvest ───────────────────────────

function TextureOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
      backgroundImage: `url(${TEXTURE_URL})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      mixBlendMode: "multiply",
      opacity: 0.055,
    }} />
  );
}

// Verso — left page: metadata, time, page number
function ShiftVerso({
  entry,
  index,
  isLast,
  isCover,
  totalEntries,
}: {
  entry?: JournalEntry;
  index?: number;
  isLast?: boolean;
  isCover?: boolean;
  totalEntries: number;
}) {
  return (
    <div style={{
      width: "min(41vw, 300px)",
      aspectRatio: "8.5 / 11",
      background: "#faf9f7",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
      boxShadow: "inset -6px 0 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)",
    }}>
      <TextureOverlay />
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "linear-gradient(to right, rgba(0,0,0,0.04), transparent)", pointerEvents: "none", zIndex: 7 }} />

      <div style={{ position: "absolute", inset: 0, padding: "10% 12% 12% 9%", display: "flex", flexDirection: "column", zIndex: 8 }}>
        {isCover ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderTop: "0.5px solid #c8c5bf", paddingTop: 10 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.22em", textTransform: "uppercase", color: "#aaa" }}>field notes</p>
              </div>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(10px,2vw,15px)", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.3, color: "#2a2824" }}>foood</p>
              <div style={{ borderBottom: "0.5px solid #c8c5bf", marginTop: 4 }} />
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.9vw,7px)", letterSpacing: "0.08em", lineHeight: 2, color: "#888", fontStyle: "italic" }}>
                {"the restaurant\nis a gallery.\nalways something to improve."}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.1em", color: "#ccc" }}>— waituntilmay</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderTop: "0.5px solid #c8c5bf", paddingTop: 8 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaa" }}>field notes</p>
              </div>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(9px,1.8vw,13px)", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.3, color: "#2a2824" }}>foood</p>
            </div>

            {/* Large editorial page number */}
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(36px,8vw,64px)", color: "#ede9e3", lineHeight: 1, letterSpacing: "-0.02em", userSelect: "none" }}>
              {index !== undefined ? String(index + 1).padStart(2, "0") : "—"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entry && (
                <>
                  <div style={{ borderTop: "0.5px solid #c8c5bf", paddingTop: 8 }}>
                    <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.12em", textTransform: "uppercase", color: "#888" }}>{entry.time}</p>
                  </div>
                  <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.1em", color: "#bbb" }}>
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </>
              )}
              {isLast && (
                <div style={{ marginTop: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={CREST_URL} alt="" style={{ width: "clamp(22px,4vw,34px)", opacity: 0.45, filter: "grayscale(1)" }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Recto — right page: the content (photo + note)
function ShiftRecto({
  entry,
  index,
  isLast,
  isCover,
  totalEntries,
  onClick,
}: {
  entry?: JournalEntry;
  index?: number;
  isLast?: boolean;
  isCover?: boolean;
  totalEntries: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: "min(41vw, 300px)",
        aspectRatio: "8.5 / 11",
        background: "#faf9f7",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
        boxShadow: "inset 6px 0 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.09), 4px 0 8px rgba(0,0,0,0.04)",
      }}
    >
      <TextureOverlay />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 3, background: "linear-gradient(to left, rgba(0,0,0,0.03), transparent)", pointerEvents: "none", zIndex: 7 }} />

      <div style={{ position: "absolute", inset: 0, padding: "10% 9% 12% 12%", display: "flex", flexDirection: "column", zIndex: 8 }}>
        {isCover ? (
          /* Cover recto */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <div style={{ borderTop: "1px solid #2a2824", paddingTop: 10 }}>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(14px,3vw,22px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2, color: "#2a2824" }}>am shift</p>
              </div>
              <div style={{ borderBottom: "0.5px solid #c8c5bf" }} />
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.9vw,7px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa" }}>a daily record</p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.12em", color: "#ccc" }}>
                {String(totalEntries).padStart(5, "0")} {totalEntries === 1 ? "entry" : "entries"} today
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CREST_URL} alt="" style={{ width: "clamp(26px,4.5vw,40px)", opacity: 0.35, filter: "grayscale(1)" }} />
            </div>
          </div>
        ) : (
          /* Entry recto */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
            {/* Photo — framed, takes most of page if present */}
            {entry?.photoUrl && (
              <div style={{
                flex: entry.note ? "0 0 55%" : 1,
                border: "0.5px solid #d4cfc8",
                overflow: "hidden",
                background: "#f0ede8",
                minHeight: 0,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )}

            {/* Note text */}
            {entry?.note && (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderTop: entry.photoUrl ? "0.5px solid #d4cfc8" : undefined,
                paddingTop: entry.photoUrl ? 8 : 0,
                minHeight: 0,
                overflow: "hidden",
              }}>
                <p style={{
                  fontFamily: FONT_MONO,
                  fontSize: "clamp(6px,1.1vw,8px)",
                  lineHeight: 1.9,
                  color: "#444",
                  letterSpacing: "0.03em",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: entry.photoUrl ? 6 : 14,
                  WebkitBoxOrient: "vertical",
                }}>
                  {entry.note}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!entry?.photoUrl && !entry?.note && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: 7, color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase" }}>empty</p>
              </div>
            )}

            {/* Bottom bar */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "0.5px solid #e8e5df", paddingTop: 6 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.85vw,6px)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>foood</p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.08em", color: "#bbb" }}>
                {index !== undefined ? String(index + 1).padStart(5, "0") : ""}
              </p>
            </div>

            {isLast && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CREST_URL} alt="" style={{ width: "clamp(18px,3.2vw,28px)", opacity: 0.38, filter: "grayscale(1)" }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gutter / spine between pages ──────────────────────────────────────────────

function Gutter() {
  return (
    <div style={{
      width: 6, flexShrink: 0, alignSelf: "stretch",
      background: "linear-gradient(to right, rgba(0,0,0,0.13) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.09) 100%)",
    }} />
  );
}

// ── Spread — one pair of pages ────────────────────────────────────────────────

function Spread({ verso, recto }: { verso: React.ReactNode; recto: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      filter: "drop-shadow(0 16px 48px rgba(0,0,0,0.14))",
    }}>
      {verso}
      <Gutter />
      {recto}
    </div>
  );
}

// ── Composer overlay ──────────────────────────────────────────────────────────

function Composer({ onAdd, onClose }: { onAdd: (e: JournalEntry) => void; onClose: () => void }) {
  const [note, setNote]         = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(file: File) {
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
    setPhotoUrl(null);
  }

  async function submit() {
    if (!note.trim() && !photoFile && !photoUrl) return;
    setUploading(true);
    let finalUrl: string | undefined;
    if (photoFile) {
      try {
        const blob = await upload(`foood/${Date.now()}-${photoFile.name}`, photoFile, { access: "public", handleUploadUrl: "/api/upload" });
        finalUrl = blob.url;
      } catch {
        finalUrl = preview ?? undefined;
      }
    } else if (photoUrl) {
      finalUrl = photoUrl;
    }
    const now = new Date();
    onAdd({
      id: Date.now().toString(),
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      date: TODAY_KEY(),
      note: note.trim() || undefined,
      photoUrl: finalUrl,
    });
    setUploading(false);
    onClose();
  }

  const hasContent = note.trim() || preview || photoUrl;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "#f0ede8",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "0.5px solid #c8c5bf" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888" }}>new entry</p>
        <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", cursor: "pointer" }}>cancel</button>
      </div>

      {/* Live preview — mini spread */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(20px,4vh,40px) 20px", minHeight: 0 }}>
        <Spread
          verso={
            <ShiftVerso
              isCover={false}
              totalEntries={0}
              entry={{ id: "preview", time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }), date: TODAY_KEY(), note, photoUrl: preview ?? undefined }}
              index={0}
            />
          }
          recto={
            <ShiftRecto
              isCover={false}
              totalEntries={0}
              entry={{ id: "preview", time: "", date: TODAY_KEY(), note: note || undefined, photoUrl: preview ?? undefined }}
              index={0}
            />
          }
        />
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, background: "#faf9f7", borderTop: "0.5px solid #c8c5bf", padding: "20px 24px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="write something..."
          rows={3}
          style={{
            width: "100%", border: "none", borderBottom: "0.5px solid #c8c5bf",
            background: "transparent", padding: "8px 0",
            fontSize: 12, lineHeight: 1.8, color: "#333",
            resize: "none", outline: "none", fontFamily: FONT_MONO,
            letterSpacing: "0.02em",
          }}
        />

        {preview && (
          <div style={{ position: "relative", width: 72, height: 72, background: "#f0ede8", overflow: "hidden", border: "0.5px solid #d4cfc8" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button
              onClick={() => { setPreview(null); setPhotoFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO }}
            >×</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ""; }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ flex: 1, border: "0.5px solid #c8c5bf", background: "none", padding: "11px", fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", color: "#888" }}
          >
            + photo
          </button>
          <button
            onClick={submit}
            disabled={uploading || !hasContent}
            style={{
              flex: 2, background: "#2a2824", color: "#faf9f7", border: "none",
              padding: "11px", fontFamily: FONT_MONO, fontSize: 8,
              letterSpacing: "0.18em", textTransform: "uppercase",
              cursor: (uploading || !hasContent) ? "default" : "pointer",
              opacity: (uploading || !hasContent) ? 0.4 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {uploading ? "saving..." : "add to book →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Book reader — flip through spreads ────────────────────────────────────────

type FlipPhase = "idle" | "fold-out" | "fold-in";

function ShiftBookReader({
  entries,
  onNewEntry,
}: {
  entries: JournalEntry[];
  onNewEntry: () => void;
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [shown, setShown]     = useState(0);
  const [phase, setPhase]     = useState<FlipPhase>("idle");
  const [flipDir, setFlipDir] = useState<"fwd" | "back">("fwd");
  const touchX                = useRef<number | null>(null);
  const busy                  = useRef(false);
  const total                 = entries.length + 1; // +1 for cover

  const goTo = useCallback((next: number) => {
    if (busy.current || next < 0 || next >= total) return;
    busy.current = true;
    const dir: "fwd" | "back" = next > pageIdx ? "fwd" : "back";
    setFlipDir(dir);
    setPhase("fold-out");
    setTimeout(() => {
      setShown(next);
      setPageIdx(next);
      setPhase("fold-in");
      setTimeout(() => { setPhase("idle"); busy.current = false; }, 240);
    }, 240);
  }, [pageIdx, total]);

  const goNext = useCallback(() => goTo(pageIdx + 1), [goTo, pageIdx]);
  const goPrev = useCallback(() => goTo(pageIdx - 1), [goTo, pageIdx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 44) dx < 0 ? goNext() : goPrev();
    touchX.current = null;
  }

  let spreadTransform = "none";
  let spreadOrigin    = "center center";
  let spreadOpacity   = 1;
  if (phase === "fold-out") {
    spreadOrigin    = flipDir === "fwd" ? "right center" : "left center";
    spreadTransform = flipDir === "fwd" ? "perspective(1200px) rotateY(-12deg) scale(0.97)" : "perspective(1200px) rotateY(12deg) scale(0.97)";
    spreadOpacity   = 0.55;
  } else if (phase === "fold-in") {
    spreadOrigin    = flipDir === "fwd" ? "left center" : "right center";
    spreadTransform = "perspective(1200px) rotateY(0deg) scale(1)";
  }
  const transition = phase === "idle" ? "none" : "transform 0.24s cubic-bezier(0.4,0,0.2,1), opacity 0.24s ease";

  const entry  = shown > 0 ? entries[shown - 1] : undefined;
  const isLast = shown === entries.length && entries.length > 0;
  const isCover = shown === 0;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#f0ede8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {/* Counter */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", color: "#aaa", textTransform: "uppercase" }}>
          {isCover ? "field notes" : `${String(shown).padStart(2,"0")} / ${String(entries.length).padStart(2,"0")}`}
        </p>
      </div>

      {/* Spread */}
      <div style={{ transformOrigin: spreadOrigin, transform: spreadTransform, transition, opacity: spreadOpacity, willChange: "transform, opacity" }}>
        <Spread
          verso={<ShiftVerso entry={entry} index={entry ? shown - 1 : undefined} isLast={isLast} isCover={isCover} totalEntries={entries.length} />}
          recto={<ShiftRecto entry={entry} index={entry ? shown - 1 : undefined} isLast={isLast} isCover={isCover} totalEntries={entries.length} />}
        />
      </div>

      {/* Tap zones */}
      <button onClick={goPrev} disabled={pageIdx === 0} aria-label="previous" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "16%", background: "none", border: "none", cursor: pageIdx === 0 ? "default" : "pointer", zIndex: 10 }} />
      <button onClick={goNext} disabled={pageIdx >= total - 1} aria-label="next" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "16%", background: "none", border: "none", cursor: pageIdx >= total - 1 ? "default" : "pointer", zIndex: 10 }} />

      {/* Nav bar */}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 32 }}>
        <button onClick={goPrev} disabled={pageIdx === 0} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 18, color: pageIdx === 0 ? "#d4cfc8" : "#888", cursor: pageIdx === 0 ? "default" : "pointer" }}>‹</button>
        <button
          onClick={onNewEntry}
          style={{ background: "none", border: "0.5px solid #c8c5bf", fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase", padding: "7px 18px", cursor: "pointer", color: "#888" }}
        >
          + entry
        </button>
        <button onClick={goNext} disabled={pageIdx >= total - 1} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 18, color: pageIdx >= total - 1 ? "#d4cfc8" : "#888", cursor: pageIdx >= total - 1 ? "default" : "pointer" }}>›</button>
      </div>
    </div>
  );
}

// ── FadeIn ────────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useFadeIn(0.05, delay);
  return <div ref={ref}>{children}</div>;
}

// ── Checklist ─────────────────────────────────────────────────────────────────

function Checklist({ data, onToggle, onOpenBook }: { data: ShiftData; onToggle: (id: string) => void; onOpenBook: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const headerRef = useFadeIn(0.05, 0);
  const progress  = data.checked.length / TASKS.length;
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <main style={{ fontFamily: FONT_MONO, minHeight: "100svh", background: "#fff", color: "#000" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px 80px" }}>

        <div ref={headerRef} style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1, marginBottom: 6 }}>FOOOD</p>
          <p style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "#bbb", marginBottom: 14 }}>waituntilmay</p>
          <p style={{ fontSize: 9, letterSpacing: "0.14em", color: "#aaa" }}>{dateLabel}</p>
          <div style={{ width: "100%", borderTop: "1px solid #e8e8e8", marginTop: 20 }} />
        </div>

        <FadeIn delay={60}>
          <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#bbb", marginBottom: 20 }}>am shift</p>
        </FadeIn>

        <FadeIn delay={80}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ height: 1, background: "#f0f0f0", marginBottom: 6 }}>
              <div style={{ height: "100%", background: "#000", width: `${progress * 100}%`, transition: "width 0.4s ease" }} />
            </div>
            <p style={{ fontSize: 8, letterSpacing: "0.14em", color: "#ccc", textAlign: "right" }}>{data.checked.length} / {TASKS.length}</p>
          </div>
        </FadeIn>

        <div style={{ display: "flex", flexDirection: "column", marginBottom: 48 }}>
          {TASKS.map((task, i) => {
            const done = data.checked.includes(task.id);
            const exp  = expanded === task.id;
            return (
              <FadeIn key={task.id} delay={100 + i * 40}>
                <div style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", cursor: "pointer" }} onClick={() => setExpanded(exp ? null : task.id)}>
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(task.id); }}
                      style={{ width: 16, height: 16, border: `1px solid ${done ? "#000" : "#ccc"}`, background: done ? "#000" : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
                    >
                      {done && <span style={{ color: "#fff", fontSize: 9 }}>✓</span>}
                    </button>
                    <p style={{ flex: 1, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.5, color: done ? "#ccc" : "#000", textDecoration: done ? "line-through" : "none", textDecorationColor: "#ccc", transition: "all 0.2s ease" }}>
                      {task.label}
                    </p>
                    <span style={{ fontSize: 9, color: "#ddd", paddingTop: 2 }}>{exp ? "−" : "+"}</span>
                  </div>
                  {exp && (
                    <div style={{ paddingLeft: 30, paddingBottom: 16 }}>
                      <p style={{ fontSize: 10, letterSpacing: "0.04em", color: "#888", lineHeight: 1.7 }}>{task.detail}</p>
                      {task.link && (
                        <a href={task.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                          {task.linkLabel}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid #e8e8e8", marginTop: 16, paddingTop: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 1, height: 40, background: "#e8e8e8" }} />
          <button
            onClick={onOpenBook}
            style={{ background: "#000", color: "#fff", border: "none", padding: "13px 36px", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}
          >
            field notes →
          </button>
          {data.entries.length > 0 ? (
            <p style={{ fontSize: 8, letterSpacing: "0.12em", color: "#ccc", textTransform: "uppercase" }}>
              {data.entries.length} {data.entries.length === 1 ? "entry" : "entries"} today
            </p>
          ) : (
            <p style={{ fontSize: 8, letterSpacing: "0.12em", color: "#ddd", textTransform: "uppercase", textAlign: "center", lineHeight: 2 }}>
              document the shift
            </p>
          )}
        </div>

        <div style={{ borderTop: "1px solid #e8e8e8", marginTop: 56, paddingTop: 20 }}>
          <a href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ccc" }}>← waituntilmay</a>
        </div>
      </div>
    </main>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function FooodPage() {
  const [data, setData]         = useState<ShiftData>({ date: TODAY_KEY(), checked: [], entries: [] });
  const [view, setView]         = useState<"checklist" | "book">("checklist");
  const [composing, setComposing] = useState(false);

  useEffect(() => { setData(loadData()); }, []);

  function toggleTask(id: string) {
    setData(prev => {
      const next    = prev.checked.includes(id) ? prev.checked.filter(c => c !== id) : [...prev.checked, id];
      const updated = { ...prev, checked: next };
      saveData(updated);
      return updated;
    });
  }

  function addEntry(entry: JournalEntry) {
    setData(prev => {
      const updated = { ...prev, entries: [...prev.entries, entry] };
      saveData(updated);
      return updated;
    });
    setComposing(false);
  }

  if (view === "book") {
    return (
      <>
        {/* Back button */}
        <button
          onClick={() => setView("checklist")}
          style={{ position: "fixed", top: 18, left: 20, zIndex: 200, background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#aaa", cursor: "pointer" }}
        >
          ← checklist
        </button>

        <ShiftBookReader
          entries={data.entries}
          onNewEntry={() => setComposing(true)}
        />

        {composing && (
          <Composer
            onAdd={addEntry}
            onClose={() => setComposing(false)}
          />
        )}
      </>
    );
  }

  return (
    <Checklist
      data={data}
      onToggle={toggleTask}
      onOpenBook={() => setView("book")}
    />
  );
}
