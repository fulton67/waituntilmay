"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { useFadeIn } from "@/lib/useFadeIn";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

// ── Tasks ─────────────────────────────────────────────────────────────────────

const TASKS = [
  {
    id: "buckets",
    label: "set up mop buckets",
    detail: "grab the squeeze combo from the mop sink — put one in, split between two buckets",
    link: "https://www.bakedeco.com/detail.asp?id=9834",
    linkLabel: "squeeze combo →",
  },
  {
    id: "cambro",
    label: "fill medium cambro with dish soap",
    detail: "fill from the sink — bring to the front sink station with a bus bin and dirty cup rack",
  },
  {
    id: "white-towels",
    label: "white towels near the oven",
    detail: "place them where cooks will be working",
  },
  {
    id: "sani-buckets",
    label: "brown towels + sani buckets",
    detail: "brown towels in yellow bucket. red bucket = sani. both go under back sink AND under front sink",
  },
  {
    id: "windows",
    label: "clean all windows",
    detail: "warm soapy water in blue bucket + squeeze combo (next to mop sink). dry with microfiber — towels are in black containers with yellow rim, back of basement",
  },
  {
    id: "counters",
    label: "spray down counters",
    detail: "use the yellow cleaner next to the chef sink",
  },
  {
    id: "walk",
    label: "walk the space",
    detail: "look for what can be improved. the restaurant is a gallery. there is always something dirty — clean it",
  },
];

const TASK_IDS = TASKS.map(t => t.id);

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "foood-shift";
const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

interface BlockData {
  type: "text" | "photo";
  content: string;
  x: number;
  y: number;
  w: number;
}

interface JournalEntry {
  id: string;
  time: string;
  blocks: BlockData[];
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
      const parsed: ShiftData = JSON.parse(raw);
      if (parsed.date === TODAY_KEY()) return parsed;
    }
  } catch {}
  return { date: TODAY_KEY(), checked: [], entries: [] };
}

function saveData(data: ShiftData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── FadeIn ────────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useFadeIn(0.05, delay);
  return <div ref={ref} style={style}>{children}</div>;
}

// ── Draggable block on a book page ────────────────────────────────────────────

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

function DraggableBlock({
  block,
  pageW,
  pageH,
  onMove,
  onResize,
  onDelete,
  readOnly,
}: {
  block: BlockData;
  pageW: number;
  pageH: number;
  onMove: (x: number, y: number) => void;
  onResize: (w: number) => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const dragRef = useRef<DragState | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  const clampX = (x: number, w: number) => Math.max(0, Math.min(x, pageW - w));
  const clampY = (y: number) => Math.max(0, Math.min(y, pageH - 60));

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (readOnly) return;
    dragRef.current = { startX: clientX, startY: clientY, origX: block.x, origY: block.y };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = cx - dragRef.current.startX;
      const dy = cy - dragRef.current.startY;
      onMove(clampX(dragRef.current.origX + dx, block.w * pageW), clampY(dragRef.current.origY + dy));
    };

    const onEnd = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.x, block.y, block.w, pageW, pageH, readOnly]);

  const widthPct = block.w;
  const left = block.x;
  const top = block.y;

  return (
    <div
      ref={elRef}
      style={{
        position: "absolute",
        left,
        top,
        width: `${widthPct * 100}%`,
        cursor: readOnly ? "default" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
      onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
    >
      {!readOnly && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: -10, right: -10, zIndex: 10,
            width: 20, height: 20, borderRadius: "50%",
            background: "#000", color: "#fff", border: "none",
            fontSize: 10, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}
        >×</button>
      )}

      {block.type === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.content}
          alt=""
          draggable={false}
          style={{ width: "100%", display: "block", objectFit: "cover" }}
        />
      ) : (
        <p style={{
          fontFamily: FONT_MONO,
          fontSize: "clamp(9px, 1.6vw, 11px)",
          lineHeight: 1.85,
          color: "#333",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          padding: 2,
          borderBottom: readOnly ? "none" : "1px dashed #e0e0e0",
        }}>
          {block.content}
        </p>
      )}

      {/* Resize handle */}
      {!readOnly && (
        <div
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            const startX = e.clientX;
            const origW = widthPct;
            const onMv = (ev: MouseEvent) => {
              const delta = (ev.clientX - startX) / pageW;
              onResize(Math.max(0.2, Math.min(1, origW + delta)));
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMv);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMv);
            window.addEventListener("mouseup", onUp);
          }}
          onTouchStart={e => {
            e.stopPropagation();
            const startX = e.touches[0].clientX;
            const origW = widthPct;
            const onMv = (ev: TouchEvent) => {
              const delta = (ev.touches[0].clientX - startX) / pageW;
              onResize(Math.max(0.2, Math.min(1, origW + delta)));
            };
            const onUp = () => {
              window.removeEventListener("touchmove", onMv);
              window.removeEventListener("touchend", onUp);
            };
            window.addEventListener("touchmove", onMv, { passive: false });
            window.addEventListener("touchend", onUp);
          }}
          style={{
            position: "absolute", bottom: -6, right: -6,
            width: 14, height: 14,
            background: "#000", cursor: "ew-resize",
            opacity: 0.25,
          }}
        />
      )}
    </div>
  );
}

// ── Book page ─────────────────────────────────────────────────────────────────

const PAGE_ASPECT = 8.5 / 11;

function BookPage({
  entry,
  pageNum,
  editable,
  onUpdateBlock,
  onDeleteBlock,
}: {
  entry: JournalEntry;
  pageNum: number;
  editable?: boolean;
  onUpdateBlock?: (blockIdx: number, patch: Partial<BlockData>) => void;
  onDeleteBlock?: (blockIdx: number) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 320, h: 320 / PAGE_ASPECT });

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setDims({ w, h: w / PAGE_ASPECT });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{
      height: "100svh",
      scrollSnapAlign: "start",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(56px,9vh,96px) clamp(24px,6vw,80px) clamp(40px,6vh,72px)",
      boxSizing: "border-box",
    }}>
      {/* The paper */}
      <div
        ref={pageRef}
        style={{
          width: "min(72vw, 420px)",
          aspectRatio: `${PAGE_ASPECT}`,
          background: "#fafafa",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10), -3px 0 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Spine shadow */}
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 10, background: "linear-gradient(to right, rgba(0,0,0,0.10), transparent)", pointerEvents: "none", zIndex: 2 }} />

        {/* Header stripe */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "10px 14px 8px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid #ebebeb",
          background: "#fafafa",
          zIndex: 1,
        }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc" }}>
            foood — {entry.time}
          </span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.12em", color: "#ccc" }}>{pageNum}</span>
        </div>

        {/* Footer stripe */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "8px 14px",
          borderTop: "1px solid #ebebeb",
          background: "#fafafa",
          zIndex: 1,
        }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "#e0e0e0", textAlign: "center" }}>waituntilmay</p>
        </div>

        {/* Content canvas — blocks are positioned absolutely inside here */}
        <div style={{
          position: "absolute",
          top: 34, left: 0, right: 0, bottom: 28,
          overflow: "hidden",
        }}>
          {entry.blocks.map((block, i) => (
            <DraggableBlock
              key={i}
              block={block}
              pageW={dims.w}
              pageH={dims.h - 34 - 28}
              readOnly={!editable}
              onMove={(x, y) => onUpdateBlock?.(i, { x, y })}
              onResize={w => onUpdateBlock?.(i, { w })}
              onDelete={() => onDeleteBlock?.(i)}
            />
          ))}
          {entry.blocks.length === 0 && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#e0e0e0" }}>
                {editable ? "add text or photos below" : "empty page"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Caption below page */}
      <div style={{ marginTop: 16, width: "min(72vw, 420px)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb" }}>
          {entry.time}
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#ccc" }}>
          {String(pageNum).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}

// ── New entry composer ────────────────────────────────────────────────────────

function EntryComposer({
  onAdd,
}: {
  onAdd: (entry: JournalEntry) => void;
}) {
  const [draft, setDraft] = useState<BlockData[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [added, setAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addText() {
    if (!note.trim()) return;
    setDraft(prev => [...prev, {
      type: "text",
      content: note.trim(),
      x: 14,
      y: Math.max(0, prev.length * 60),
      w: 0.85,
    }]);
    setNote("");
  }

  async function addPhoto(file: File) {
    setUploading(true);
    try {
      let photoUrl: string;
      try {
        const blob = await upload(`foood/${Date.now()}-${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        photoUrl = blob.url;
      } catch {
        photoUrl = URL.createObjectURL(file);
      }
      setDraft(prev => [...prev, {
        type: "photo",
        content: photoUrl,
        x: 14,
        y: Math.max(0, prev.length * 60),
        w: 0.75,
      }]);
    } finally {
      setUploading(false);
    }
  }

  function updateDraftBlock(i: number, patch: Partial<BlockData>) {
    setDraft(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  }

  function deleteDraftBlock(i: number) {
    setDraft(prev => prev.filter((_, idx) => idx !== i));
  }

  function commit() {
    if (!draft.length) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      blocks: draft,
    };
    onAdd(entry);
    setDraft([]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  // Preview page for the draft
  const draftEntry: JournalEntry = {
    id: "draft",
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    blocks: draft,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Live preview of the draft page — editable */}
      {draft.length > 0 && (
        <section style={{
          height: "100svh",
          scrollSnapAlign: "start",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(56px,9vh,96px) clamp(24px,6vw,80px) clamp(40px,6vh,72px)",
          boxSizing: "border-box",
        }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "#aaa", marginBottom: 12 }}>
            draft — drag to arrange
          </p>
          <div style={{ width: "min(72vw, 420px)", aspectRatio: `${PAGE_ASPECT}`, background: "#fafafa", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px dashed #ddd" }}>
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 10, background: "linear-gradient(to right, rgba(0,0,0,0.08), transparent)", pointerEvents: "none", zIndex: 2 }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ebebeb", background: "#fafafa", zIndex: 1 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc" }}>foood — now</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 7, color: "#ccc" }}>draft</span>
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 14px", borderTop: "1px solid #ebebeb", background: "#fafafa", zIndex: 1 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "#e0e0e0", textAlign: "center" }}>waituntilmay</p>
            </div>
            <DraftCanvas blocks={draft} onUpdate={updateDraftBlock} onDelete={deleteDraftBlock} />
          </div>
          <button
            onClick={commit}
            style={{
              marginTop: 16, background: "#000", color: "#fff", border: "none",
              padding: "10px 28px", fontFamily: FONT_MONO, fontSize: 9,
              letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer",
              width: "min(72vw, 420px)",
            }}
          >
            {added ? "saved ✓" : "add page →"}
          </button>
        </section>
      )}

      {/* Compose tools */}
      <section style={{
        height: "100svh",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(56px,9vh,96px) clamp(24px,6vw,80px) clamp(40px,6vh,72px)",
        boxSizing: "border-box",
        gap: 0,
      }}>
        <div style={{ width: "min(72vw, 420px)", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb" }}>
            add to your page
          </p>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="write something..."
            rows={4}
            style={{
              width: "100%",
              border: "none",
              borderBottom: "1px solid #e8e8e8",
              background: "transparent",
              padding: "10px 0",
              fontSize: 11,
              lineHeight: 1.8,
              color: "#333",
              resize: "none",
              outline: "none",
              fontFamily: FONT_MONO,
            }}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); addText(); }
            }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={addText}
              disabled={!note.trim()}
              style={{
                flex: 1, border: "1px solid #e0e0e0", background: "none",
                padding: "10px", fontFamily: FONT_MONO, fontSize: 9,
                letterSpacing: "0.14em", textTransform: "uppercase", cursor: note.trim() ? "pointer" : "default",
                color: note.trim() ? "#000" : "#ddd", transition: "color 0.15s",
              }}
            >
              + text
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                flex: 1, border: "1px solid #e0e0e0", background: "none",
                padding: "10px", fontFamily: FONT_MONO, fontSize: 9,
                letterSpacing: "0.14em", textTransform: "uppercase",
                cursor: uploading ? "wait" : "pointer", color: uploading ? "#bbb" : "#000",
              }}
            >
              {uploading ? "uploading..." : "+ photo"}
            </button>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) addPhoto(file);
              e.target.value = "";
            }}
          />

          {draft.length > 0 && (
            <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.12em", color: "#bbb", textTransform: "uppercase" }}>
              ↑ scroll up to arrange your page
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ── DraftCanvas — uses actual measured dimensions ─────────────────────────────

function DraftCanvas({
  blocks,
  onUpdate,
  onDelete,
}: {
  blocks: BlockData[];
  onUpdate: (i: number, patch: Partial<BlockData>) => void;
  onDelete: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 300, h: 300 / PAGE_ASPECT });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setDims({ w, h: w / PAGE_ASPECT });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", top: 34, left: 0, right: 0, bottom: 28, overflow: "hidden" }}>
      {blocks.map((block, i) => (
        <DraggableBlock
          key={i}
          block={block}
          pageW={dims.w}
          pageH={dims.h - 34 - 28}
          onMove={(x, y) => onUpdate(i, { x, y })}
          onResize={w => onUpdate(i, { w })}
          onDelete={() => onDelete(i)}
        />
      ))}
      {blocks.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#e0e0e0" }}>add text or photos below</p>
        </div>
      )}
    </div>
  );
}

// ── Journal section ───────────────────────────────────────────────────────────

function JournalSection({ data, setData }: { data: ShiftData; setData: (d: ShiftData) => void }) {
  function updateBlock(entryId: string, blockIdx: number, patch: Partial<BlockData>) {
    setData({
      ...data,
      entries: data.entries.map(e =>
        e.id === entryId
          ? { ...e, blocks: e.blocks.map((b, i) => i === blockIdx ? { ...b, ...patch } : b) }
          : e
      ),
    });
  }

  function deleteBlock(entryId: string, blockIdx: number) {
    setData({
      ...data,
      entries: data.entries.map(e =>
        e.id === entryId
          ? { ...e, blocks: e.blocks.filter((_, i) => i !== blockIdx) }
          : e
      ),
    });
  }

  function addEntry(entry: JournalEntry) {
    const updated = { ...data, entries: [...data.entries, entry] };
    setData(updated);
    saveData(updated);
  }

  return (
    <div style={{ scrollSnapType: "y mandatory", overflowY: "scroll", height: "100svh" }}>
      {/* Intro page */}
      <section style={{
        height: "100svh",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(64px,10vh,100px) clamp(32px,8vw,80px)",
        boxSizing: "border-box",
      }}>
        <div style={{ maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(24px,5vw,40px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 }}>
            field notes
          </p>
          <div style={{ borderTop: "1px solid #efefef" }} />
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.04em", lineHeight: 2.1, color: "#555", fontStyle: "italic" }}>
            {"the restaurant is a gallery.\na constant and active project."}
          </p>
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
            — scroll to add your first page ↓
          </p>
        </div>
      </section>

      {/* Existing pages */}
      {data.entries.map((entry, i) => (
        <BookPage
          key={entry.id}
          entry={entry}
          pageNum={i + 1}
          editable
          onUpdateBlock={(bi, patch) => updateBlock(entry.id, bi, patch)}
          onDeleteBlock={bi => deleteBlock(entry.id, bi)}
        />
      ))}

      {/* Composer */}
      <EntryComposer onAdd={addEntry} />
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────

function Checklist({
  data,
  onToggle,
  onOpenJournal,
}: {
  data: ShiftData;
  onToggle: (id: string) => void;
  onOpenJournal: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const headerRef = useFadeIn(0.05, 0);
  const allDone = TASK_IDS.every(id => data.checked.includes(id));
  const progress = data.checked.length / TASKS.length;
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <main style={{ fontFamily: FONT_MONO, minHeight: "100svh", background: "#fff", color: "#000" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px 80px" }}>

        {/* Header */}
        <div ref={headerRef} style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1, marginBottom: 6 }}>FOOOD</p>
          <p style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "#bbb", marginBottom: 14 }}>waituntilmay</p>
          <p style={{ fontSize: 9, letterSpacing: "0.14em", color: "#aaa" }}>{dateLabel}</p>
          <div style={{ width: "100%", borderTop: "1px solid #e8e8e8", marginTop: 20 }} />
        </div>

        <FadeIn delay={60}>
          <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#bbb", marginBottom: 20 }}>am shift</p>
        </FadeIn>

        {/* Progress bar */}
        <FadeIn delay={80}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ height: 1, background: "#f0f0f0", marginBottom: 6 }}>
              <div style={{ height: "100%", background: "#000", width: `${progress * 100}%`, transition: "width 0.4s ease" }} />
            </div>
            <p style={{ fontSize: 8, letterSpacing: "0.14em", color: "#ccc", textAlign: "right" }}>
              {data.checked.length} / {TASKS.length}
            </p>
          </div>
        </FadeIn>

        {/* Tasks */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 48 }}>
          {TASKS.map((task, i) => {
            const done = data.checked.includes(task.id);
            const exp = expanded === task.id;
            return (
              <FadeIn key={task.id} delay={100 + i * 40}>
                <div style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <div
                    style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", cursor: "pointer" }}
                    onClick={() => setExpanded(exp ? null : task.id)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(task.id); }}
                      style={{
                        width: 16, height: 16, border: `1px solid ${done ? "#000" : "#ccc"}`,
                        background: done ? "#000" : "transparent",
                        cursor: "pointer", flexShrink: 0, marginTop: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {done && <span style={{ color: "#fff", fontSize: 9 }}>✓</span>}
                    </button>
                    <p style={{
                      flex: 1, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                      lineHeight: 1.5, color: done ? "#ccc" : "#000",
                      textDecoration: done ? "line-through" : "none",
                      textDecorationColor: "#ccc", transition: "all 0.2s ease",
                    }}>
                      {task.label}
                    </p>
                    <span style={{ fontSize: 9, color: "#ddd", paddingTop: 2 }}>{exp ? "−" : "+"}</span>
                  </div>
                  {exp && (
                    <div style={{ paddingLeft: 30, paddingBottom: 16 }}>
                      <p style={{ fontSize: 10, letterSpacing: "0.04em", color: "#888", lineHeight: 1.7 }}>{task.detail}</p>
                      {task.link && (
                        <a href={task.link} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-block", marginTop: 8, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", textDecoration: "underline", textUnderlineOffset: "3px" }}
                        >
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

        {/* Journal entry */}
        <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: 32 }}>
          {!allDone ? (
            <FadeIn delay={400}>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb", lineHeight: 2.2, maxWidth: 320, margin: "0 auto" }}>
                  this is just something to prime<br />your writing practice.<br />
                  your work should not be a distraction.
                </p>
              </div>
            </FadeIn>
          ) : (
            <FadeIn delay={60}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 9, letterSpacing: "0.14em", color: "#888", marginBottom: 20, lineHeight: 1.8 }}>
                  shift complete — open your field notes
                </p>
                <button
                  onClick={onOpenJournal}
                  style={{
                    background: "#000", color: "#fff", border: "none",
                    padding: "12px 32px", fontFamily: FONT_MONO, fontSize: 9,
                    letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  field notes →
                </button>
                {data.entries.length > 0 && (
                  <p style={{ marginTop: 12, fontSize: 8, letterSpacing: "0.12em", color: "#ccc", textTransform: "uppercase" }}>
                    {data.entries.length} {data.entries.length === 1 ? "page" : "pages"} today
                  </p>
                )}
              </div>
            </FadeIn>
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
  const [data, setData] = useState<ShiftData>({ date: TODAY_KEY(), checked: [], entries: [] });
  const [view, setView] = useState<"checklist" | "journal">("checklist");

  useEffect(() => {
    setData(loadData());
  }, []);

  function toggleTask(id: string) {
    setData(prev => {
      const next = prev.checked.includes(id)
        ? prev.checked.filter(c => c !== id)
        : [...prev.checked, id];
      const updated = { ...prev, checked: next };
      saveData(updated);
      return updated;
    });
  }

  function updateData(d: ShiftData) {
    setData(d);
    saveData(d);
  }

  if (view === "journal") {
    return (
      <div style={{ position: "relative" }}>
        {/* Back to checklist */}
        <button
          onClick={() => setView("checklist")}
          style={{
            position: "fixed", top: 18, left: 20, zIndex: 200,
            background: "none", border: "none", fontFamily: FONT_MONO,
            fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#bbb", cursor: "pointer",
          }}
        >
          ← checklist
        </button>
        <JournalSection data={data} setData={updateData} />
      </div>
    );
  }

  return (
    <Checklist
      data={data}
      onToggle={toggleTask}
      onOpenJournal={() => setView("journal")}
    />
  );
}
