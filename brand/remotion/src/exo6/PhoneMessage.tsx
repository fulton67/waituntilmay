import React from "react";
import { useCurrentFrame } from "remotion";
import { C, caps, cl, drift, ease, glass, lerp, p, text } from "./look";
import { Tick } from "./parts";
import { IconChat } from "./icons";

// phone-message-arrives (+ type-message-lines). Refs: glp1 f860-950 (message card on a glass object; plate 4 f, then lines),
// ro _MAYscxxhDE f746-812. Beats B06 (and B07, the same object). A built phone, never a photo: tilted in 3D (-8 deg +- 1.5 deg on a
// 3.2 s period), the layer pushing 1.00 -> 1.03, a specular band that slides with the tilt, a contact shadow that answers it.
// Timeline (props, composition frames): rise `start` (4.2 % H in 11 f, `arrive`), plate + badge `plateAt` (4 f), sender `senderAt`
// (4 f fade), lines `lineAt[i]` (4 f, 1 % H), `markAt` highlighter on `mark` (16 f sweep), status spinner -> tick at `statusAt`.
// Optional reply (B07): the reply field types `reply.text` at 3.9 chars/f from `reply.at` (DDOS f1539-1556) and sends at `reply.sendAt`.
export type PhoneProps = {
  start: number; plateAt: number; senderAt: number; lineAt: number[]; sender: string; lines: string[]; mark?: string; markAt?: number;
  statusAt?: number; statusText?: string; reply?: { text: string; at: number; sendAt: number }; x?: number; y?: number; exitAt?: number;
  move?: { at: number; dx: number; d?: number }; time?: string; endAt?: number;
};

export const PHONE = { w: 400, h: 820 };

export const PhoneMessage: React.FC<PhoneProps> = ({ start, plateAt, senderAt, lineAt, sender, lines, mark, markAt = Infinity, statusAt = Infinity,
  statusText = "Reply to book", reply, x = 1180, y = 130, exitAt = Infinity, move, time = "8:41", endAt }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const rise = p(f, start, 11, ease.arrive);
  const out = p(f, exitAt, 7, ease.exit);
  const mv = move ? p(f, move.at, move.d ?? 14, ease.sweep) * move.dx : 0;
  const ry = -8 + drift(f, 1.5, 77), rx = 3 + drift(f, 0.8, 101, 1.3);
  const push = 1 + 0.03 * ease.blank(cl(t / Math.max(1, (endAt ?? start + 120) - start)));
  const dy = (1 - rise) * 0.042 * 1080 + drift(f, 4, 77, 0.5) + out * 7;
  const plate = p(f, plateAt, 4, ease.arrive);
  const sweepX = 30 + ry * 6; // specular band follows the tilt
  const W = PHONE.w, H = PHONE.h;
  return (
    <div style={{ position: "absolute", left: x + mv, top: y, width: W, height: H, perspective: 1600, opacity: rise * (1 - out) }}>
      {/* contact shadow on the canvas */}
      <div style={{ position: "absolute", left: 40 - ry * 3, top: H - 30, width: W - 60, height: 70, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(32,37,50,.28), rgba(32,37,50,0) 70%)", filter: "blur(10px)", transform: `translateY(${dy * 0.3}px)` }} />
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateY(${dy}px) scale(${push}) rotateY(${ry}deg) rotateX(${rx}deg)` }}>
        {/* body: titanium edge (two gradients), then the black bezel, then the screen */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 64, background: "linear-gradient(135deg, #e9edf1 0%, #9aa3ad 18%, #f4f6f8 34%, #8e97a1 62%, #dfe3e7 100%)",
          boxShadow: "0 40px 80px -20px rgba(32,37,50,.35), 0 12px 24px -8px rgba(32,37,50,.25)" }} />
        <div style={{ position: "absolute", inset: 6, borderRadius: 58, background: "#0d0f13" }} />
        <div style={{ position: "absolute", inset: 18, borderRadius: 48, overflow: "hidden",
          background: "radial-gradient(ellipse 90% 60% at 30% 20%, #e9f4fb 0%, #bcd9ec 38%, #7fa7c4 70%, #4d6f8d 100%)" }}>
          {/* soft wallpaper shapes so the glass plate has something to blur */}
          <div style={{ position: "absolute", left: -80, top: 380, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,232,214,.9), rgba(255,232,214,0) 70%)", transform: `translateX(${drift(f, 10, 200)}px)` }} />
          <div style={{ position: "absolute", left: 160, top: 120, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(159,214,245,.9), rgba(159,214,245,0) 70%)" }} />
          {/* dynamic island */}
          <div style={{ position: "absolute", left: "50%", top: 14, width: 110, height: 32, marginLeft: -55, borderRadius: 20, background: "#000" }} />
          {/* lock screen clock (dims while the plate is up) */}
          <div style={{ position: "absolute", top: 82, width: "100%", textAlign: "center", ...text(20, 500, "rgba(255,255,255,.85)") }}>Tuesday, November 18</div>
          <div style={{ position: "absolute", top: 104, width: "100%", textAlign: "center", fontFamily: text(10).fontFamily, fontWeight: 500, fontSize: 104, letterSpacing: "-0.02em",
            color: "rgba(255,255,255,.92)", opacity: 1 - 0.25 * plate }}>{time}</div>
          {/* the message plate (glass on the screen) */}
          <div style={{ position: "absolute", left: 16, right: 16, top: 276, padding: "18px 20px 20px", borderRadius: 26, ...glass(26, 0.95),
            opacity: plate, transform: `translateY(${(1 - plate) * -14}px) scale(${0.96 + 0.04 * plate})`, transformOrigin: "50% 0%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: p(f, senderAt, 4) }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(160deg, #6cc6f5, #2b8fd0)", display: "grid", placeItems: "center", color: "#fff" }}><IconChat size={20} color="#fff" /></div>
              <div style={{ ...text(17, 500, C.ink), flex: 1 }}>{sender}</div>
              <div style={{ ...text(15, 400, C.ink2) }}>now</div>
            </div>
            {lines.map((l, i) => {
              const q = p(f, lineAt[i] ?? Infinity, 4, ease.arrive);
              const has = mark && l.includes(mark);
              return (
                <div key={i} style={{ ...text(20, i === 0 ? 500 : 400, C.ink), marginTop: i === 0 ? 12 : 4, opacity: q, transform: `translateY(${(1 - q) * 0.01 * 1080}px)` }}>
                  {has ? <>{l.split(mark!)[0]}<HL at={markAt}>{mark}</HL>{l.split(mark!)[1]}</> : l}
                </div>
              );
            })}
          </div>
          {/* badge */}
          <div style={{ position: "absolute", right: 12, top: 266, width: 30, height: 30, borderRadius: 15, background: "#ff5a4e", color: "#fff", display: "grid", placeItems: "center",
            ...text(16, 500, "#fff"), transform: `scale(${plate ? 0.6 + 0.4 * plate : 0})` }}>1</div>
          {reply && <Reply {...reply} />}
          {/* glass specular band over the whole screen */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(118deg, rgba(255,255,255,0) ${sweepX}%, rgba(255,255,255,.22) ${sweepX + 8}%, rgba(255,255,255,0) ${sweepX + 20}%)` }} />
        </div>
      </div>
      {f >= statusAt - 10 && <Status at={statusAt} label={statusText} y={H + 28} />}
    </div>
  );
};

const HL: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const f = useCurrentFrame();
  const u = p(f, at, 16, ease.sweep);
  return <span style={{ backgroundImage: `linear-gradient(90deg, rgba(159,214,245,.75) ${u * 100}%, transparent ${u * 100}%)`, borderRadius: 4, padding: "0 3px", margin: "0 -3px" }}>{children}</span>;
};

// reply field at the bottom of the screen: types, then the bubble sends (rises 6 px, 4 f) and turns blue
const Reply: React.FC<{ text: string; at: number; sendAt: number }> = ({ text: s, at, sendAt }) => {
  const f = useCurrentFrame();
  if (f < at - 8) return null;
  const field = p(f, at - 8, 8, ease.arrive);
  const n = Math.max(0, Math.min(s.length, Math.floor((f - at + 1) * 3.9)));
  const sent = p(f, sendAt, 4, ease.arrive);
  return (
    <>
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 34, height: 58, borderRadius: 29, ...glass(29, 0.9), opacity: field * (1 - sent * 0.4),
        display: "flex", alignItems: "center", padding: "0 20px", ...text(19, 400, C.ink) }}>
        {sent < 1 ? s.slice(0, n) : ""}<span style={{ width: 2, height: 24, background: C.blue, marginLeft: 2, opacity: sent < 1 && Math.floor(f / 6) % 2 === 0 ? 1 : 0 }} />
      </div>
      {sent > 0 && (
        <div style={{ position: "absolute", right: 22, bottom: 110 + sent * 6, maxWidth: 280, padding: "12px 18px", borderRadius: 22, borderBottomRightRadius: 6,
          background: `linear-gradient(160deg, #57b8ee, ${C.blue})`, ...text(19, 500, "#fff"), opacity: sent, transform: `scale(${0.9 + 0.1 * sent})`, transformOrigin: "100% 100%",
          boxShadow: "0 8px 20px -6px rgba(55,169,232,.5)" }}>{s}</div>
      )}
    </>
  );
};

// status chip under the phone: a spinner that becomes a tick (glp1 f935)
const Status: React.FC<{ at: number; label: string; y: number }> = ({ at, label, y }) => {
  const f = useCurrentFrame();
  const i = p(f, at - 10, 8, ease.arrive);
  const done = f >= at;
  const rot = (f * 18) % 360;
  return (
    <div style={{ position: "absolute", left: "50%", top: y, transform: `translateX(-50%) translateY(${(1 - i) * 10}px)`, opacity: i, display: "flex", alignItems: "center", gap: 10,
      padding: "10px 18px", borderRadius: 999, ...glass(999), ...caps(15, C.ink), whiteSpace: "nowrap" }}>
      {done ? <Tick at={at} size={20} /> : (
        <svg width={20} height={20} viewBox="0 0 20 20" style={{ transform: `rotate(${rot}deg)` }}>
          <path d="M10 2 a8 8 0 1 1 -8 8" fill="none" stroke={C.blue} strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      )}
      {label}
    </div>
  );
};

/** the screen-space point of the reply bubble (for the B07 arc connector's tail), composition px */
export const phoneReplyPoint = (x: number, y: number) => ({ x: x + PHONE.w - 40, y: y + PHONE.h - 160 });
