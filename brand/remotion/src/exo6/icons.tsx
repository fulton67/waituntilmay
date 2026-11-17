import React from "react";

// exo6 line icons: 24-unit grid, 1.8 stroke, round caps (one family, drawn for v6; not the YT ICON set)
const S: React.FC<{ size?: number; color?: string; children: React.ReactNode; draw?: number }> = ({ size = 28, color = "currentColor", children, draw = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", overflow: "visible", opacity: draw }}>{children}</svg>
);
type P = { size?: number; color?: string };
export const IconMail: React.FC<P> = (p) => <S {...p}><rect x={3} y={5.5} width={18} height={13} rx={2.5} /><path d="M3.8 7 L12 13 L20.2 7" /></S>;
export const IconPhone: React.FC<P> = (p) => <S {...p}><path d="M6.6 3.8 h2.6 l1.4 4 -1.9 1.5 a11 11 0 0 0 5 5 l1.5 -1.9 4 1.4 v2.6 a2 2 0 0 1 -2.2 2 A16 16 0 0 1 4.6 6 a2 2 0 0 1 2 -2.2 z" /></S>;
export const IconGift: React.FC<P> = (p) => <S {...p}><rect x={3.5} y={9} width={17} height={11} rx={2} /><path d="M2.8 9 h18.4 M12 9 v11 M12 9 c-1.5 -4 -6 -4 -5 -1.2 c0.6 1.4 5 1.2 5 1.2 c1.5 -4 6 -4 5 -1.2 c-0.6 1.4 -5 1.2 -5 1.2" /></S>;
export const IconChat: React.FC<P> = (p) => <S {...p}><path d="M4 5.5 h16 a1.5 1.5 0 0 1 1.5 1.5 v8.5 a1.5 1.5 0 0 1 -1.5 1.5 H10 l-4.5 3.5 v-3.5 H4 a1.5 1.5 0 0 1 -1.5 -1.5 V7 A1.5 1.5 0 0 1 4 5.5 z" /></S>;
export const IconClipboard: React.FC<P> = (p) => <S {...p}><rect x={5} y={4.5} width={14} height={16.5} rx={2} /><path d="M9 4.5 v-1 h6 v1 M8.5 10 h7 M8.5 13.5 h7 M8.5 17 h4" /></S>;
export const IconQuestion: React.FC<P> = (p) => <S {...p}><path d="M9.2 9 a2.9 2.9 0 1 1 4.2 2.6 c-0.9 0.5 -1.4 1.1 -1.4 2.1 v0.6 M12 17.6 v0.2" /><rect x={3} y={3} width={18} height={18} rx={9} /></S>;
export const IconSpark: React.FC<P> = (p) => <S {...p}><path d="M12 3 v5 M12 16 v5 M3 12 h5 M16 12 h5 M6 6 l2.8 2.8 M15.2 15.2 L18 18 M18 6 l-2.8 2.8 M8.8 15.2 L6 18" /></S>;
export const IconCalendar: React.FC<P> = (p) => <S {...p}><rect x={3.5} y={5} width={17} height={15.5} rx={2.5} /><path d="M3.5 10 h17 M8 3 v4 M16 3 v4" /></S>;
export const IconUsers: React.FC<P> = (p) => <S {...p}><path d="M3.5 19.5 c0.5 -3.5 3 -5.5 5.5 -5.5 s5 2 5.5 5.5 M9 11.5 a3.2 3.2 0 1 0 0 -6.4 a3.2 3.2 0 0 0 0 6.4 z M15.5 5.3 a3.1 3.1 0 0 1 0 6 M17 14.3 c2 0.6 3.2 2.4 3.5 5.2" /></S>;
