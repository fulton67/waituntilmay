import React from "react";
import { useCurrentFrame } from "remotion";
import { C, SERIF, caps, cl, ease, lerp, p, text, io } from "./look";
import { DrawnCircle, Sweep, Tick } from "./parts";
import { IconClipboard } from "./icons";

// intake-form-fill. Ref: G4 T14 evident_yt liXI5YR96w4 f3601-3928 (the cover slides up ~27 f, the page behind dims to ~30 %, items
// stack +16 to +22 f after their words). Beat B08. A consultation intake sheet on warm paper: fields fill in a written serif
// (characters at 2 per frame), a highlighter sweeps the spoken field, sub-rows tick, the last answer is circled. The camera pushes
// 1.00 -> 1.06 and its focus follows the active field (in-out, ~0.3 % per frame), so the page is never still.
export type FormField =
  | { kind: "write"; label: string; value: string; at: number }
  | { kind: "check"; label: string; rows: { text: string; at: number }[]; markAt?: number }
  | { kind: "answer"; label: string; value: string; litAt: number; circleAt: number };

export const IntakeFormFill: React.FC<{
  start: number; fields: FormField[]; title?: string; org?: string; x?: number; y?: number; exitAt?: number; end?: number; dimBackdrop?: boolean; note?: string;
}> = ({ start, fields, title = "Consultation intake", org = "Dr. Ariel Ostad · Dermatology", x = 980, y = 70, exitAt = Infinity, end, dimBackdrop = true, note }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const up = p(f, start, 14, ease.arrive); // gap round 1: 27 f / 194 px rise -> 14 f / 16 px (motion_easing.md)
  const o = p(f, exitAt, 7, ease.exit);
  const dim = p(f, start, 10, ease.arrive) * (1 - o);
  // which field is active: the last one whose first event has passed
  const firsts = fields.map((fl) => (fl.kind === "write" ? fl.at : fl.kind === "check" ? (fl.markAt ?? fl.rows[0]?.at ?? Infinity) : fl.litAt));
  let act = 0; firsts.forEach((s, i) => { if (f >= s - 6) act = i; });
  const ROW0 = 210, ROWH = 150;
  // gap round 1 (motion_easing.md: a 7.7 px one-frame jolt at f838): the focus eases between fields on `sweep` over 12 f instead of stepping
  const focusY = ROW0 + 40 + firsts.slice(1).reduce((acc, s0) => acc + ROWH * p(f, s0 - 6, 12, ease.sweep), 0);
  const total = (end ?? start + 140) - start;
  const push = 1 + 0.06 * ease.blank(cl(t / total));
  const W = 880, H = 820;
  return (
    <>
      {dimBackdrop && <div style={{ position: "absolute", inset: 0, background: "rgba(242,239,237,1)", opacity: 0.5 * dim, pointerEvents: "none" }} />}
      <div style={{ position: "absolute", left: x, top: y + (1 - io(up)) * 16 + o * 7, width: W, height: H, opacity: cl(up * 1.6) * (1 - o),
        transform: `scale(${push})`, transformOrigin: `50% ${focusY}px`, transition: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: "linear-gradient(170deg, #fffdfa, #f6f1ea)",
          boxShadow: "0 1px 0 rgba(255,255,255,.9) inset, 0 2px 3px rgba(33,27,21,.08), 0 30px 70px -24px rgba(32,37,50,.3)" }} />
        {/* paper tooth */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 22, opacity: 0.35, background: "repeating-linear-gradient(0deg, rgba(33,27,21,.018) 0 2px, transparent 2px 5px)" }} />
        <div style={{ position: "absolute", left: 56, top: 48, right: 56, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: C.ice, display: "grid", placeItems: "center", color: C.blue }}><IconClipboard size={30} color={C.blue} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ ...text(38, 500) }}>{title}</div>
            <div style={{ ...text(26, 400, C.ink2), marginTop: 2 }}>{org}</div>
          </div>
          <div style={{ ...caps(26, C.mute) }}>1 / 2</div>
        </div>
        <div style={{ position: "absolute", left: 56, right: 56, top: 150, height: 1.5, background: C.rule }} />
        {fields.map((fl, i) => <Field key={i} fl={fl} top={ROW0 + i * ROWH} active={i === act} />)}
        <Signature top={ROW0 + fields.length * ROWH + 4} at={firsts[firsts.length - 1] + 22} />
        {note && <div style={{ position: "absolute", left: 56, right: 56, bottom: 26, ...text(24, 400, C.ink2), lineHeight: 1.3 }}>{note}</div>}
      </div>
    </>
  );
};

const Field: React.FC<{ fl: FormField; top: number; active: boolean }> = ({ fl, top, active }) => {
  const f = useCurrentFrame();
  const L = { position: "absolute" as const, left: 56, right: 56, top };
  const labelC = active ? C.ink : C.ink2;
  if (fl.kind === "write") {
    const n = Math.max(0, Math.min(fl.value.length, Math.floor((f - fl.at) * 2)));
    return (
      <div style={L}>
        <div style={{ ...caps(26, labelC) }}>{fl.label}</div>
        <div style={{ marginTop: 14, height: 54, borderBottom: `1.5px solid ${C.rule}`, fontFamily: SERIF, fontWeight: 500, fontSize: 40, color: "#22406a", letterSpacing: "0.005em" }}>
          {fl.value.slice(0, n)}{n > 0 && n < fl.value.length && <span style={{ display: "inline-block", width: 2, height: 32, background: "#22406a", marginLeft: 2, verticalAlign: "-4px" }} />}
        </div>
      </div>
    );
  }
  if (fl.kind === "check") {
    return (
      <div style={L}>
        <div style={{ ...caps(26, labelC) }}>{fl.markAt != null ? <Sweep at={fl.markAt}>{fl.label}</Sweep> : fl.label}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          {fl.rows.map((r, k) => {
            const on = p(f, r.at, 5, ease.arrive);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, whiteSpace: "nowrap",
                background: `rgba(55,169,232,${0.1 * on})`, boxShadow: `inset 0 0 0 1.5px rgba(33,27,21,${lerp(0.12, 0, on)})`, ...text(26, 500, C.ink) }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, boxShadow: `inset 0 0 0 1.5px ${on > 0 ? C.blue : C.rule}`, background: "#fff", display: "grid", placeItems: "center" }}>
                  {f >= r.at && <Tick at={r.at} size={24} />}
                </div>
                {r.text}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const lit = p(f, fl.litAt, 6, ease.arrive);
  return (
    <div style={L}>
      <div style={{ ...text(32, 500, lerp(0, 1, lit) > 0.5 ? C.ink : C.ink2), opacity: 0.55 + 0.45 * lit }}>{fl.label}</div>
      <div style={{ position: "relative", display: "inline-block", marginTop: 16, padding: "6px 18px", fontFamily: SERIF, fontWeight: 500, fontSize: 36, color: "#22406a",
        opacity: p(f, fl.circleAt - 8, 8, ease.arrive) }}>
        {fl.value}
        <div style={{ position: "absolute", left: -8, top: -8 }}><DrawnCircle at={fl.circleAt} w={fl.value.length * 17 + 52} h={66} color={C.blue} /></div>
      </div>
    </div>
  );
};

// signature line: a written scribble draws on (18 f, `sweep`) once the last answer is in
const Signature: React.FC<{ top: number; at: number }> = ({ top, at }) => {
  const f = useCurrentFrame();
  const u = p(f, at, 18, ease.sweep);
  return (
    <div style={{ position: "absolute", left: 56, right: 56, top, display: "flex", alignItems: "flex-end", gap: 24 }}>
      <div style={{ position: "relative", width: 360, height: 60, borderBottom: `1.5px solid ${C.rule}` }}>
        <svg width={360} height={60} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d="M10 44 C 30 10, 44 52, 60 30 S 92 8, 100 40 C 108 58, 128 18, 146 34 S 176 50, 196 26 C 210 12, 222 44, 240 38 S 290 30, 330 36" fill="none" stroke="#22406a" strokeWidth={2.2} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - u} />
        </svg>
      </div>
      <div style={{ ...caps(26, C.mute), paddingBottom: 6 }}>Signature</div>
    </div>
  );
};
