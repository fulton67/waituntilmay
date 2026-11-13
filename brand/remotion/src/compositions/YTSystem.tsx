import { AbsoluteFill } from "remotion";
import { useElza } from "../Fonts";
import { BLUE, Canvas, Counter, Cursor, H1, HERO, ICON, INK, Icon, Kinetic, M, MUTE, RULE, TOP, Tag, Toggle, glass, GlassLife, head, label, prog, small, useT } from "../components/YT";

// One board of the YouTube v2 system (style DECISIONS 14b), for the client to see the pieces before the full render:
// the icon set (line, 3 px), the type roles, a tag typing on, a toggle, a counter, a cursor tap, the matte-white glass.
export const YTSystem: React.FC = () => {
  useElza();
  const t = useT();
  const names = Object.keys(ICON);
  return (
    <AbsoluteFill>
      <Canvas />
      <div style={{ position: "absolute", left: M, top: TOP - 60, ...label(26, MUTE) }}>Exomind · YouTube system</div>
      <div style={{ position: "absolute", left: M, top: TOP }}><Kinetic text="Total skin health" at={0.1} size={H1 * 1.5} key_={["skin"]} /></div>
      <div style={{ position: "absolute", left: M, top: TOP + 170, ...head(H1) }}>Headline, NHG Display 600</div>
      <div style={{ position: "absolute", left: M, top: TOP + 250, ...label() }}>Label, Display 500 caps</div>
      <div style={{ position: "absolute", left: M, top: TOP + 300, ...small(26) }}>Small text, NHG Text 400: subtitles, pills, notes.</div>
      <div style={{ position: "absolute", left: M, top: 600, display: "grid", gridTemplateColumns: "repeat(8, 110px)", rowGap: 34 }}>
        {names.map((n, i) => (
          <div key={n} style={{ textAlign: "center" }}>
            <Icon name={n} size={64} draw={prog(t, 0.2 + i * 0.05, 0.8)} color={i % 4 === 0 ? BLUE : INK} />
            <div style={{ ...small(18, 500), marginTop: 6 }}>{n}</div>
          </div>
        ))}
      </div>
      <div style={{ ...glass(), left: 1160, top: TOP, width: 600, height: 760 }}>
        <GlassLife />
        <div style={{ position: "relative", padding: "44px 48px", display: "grid", gap: 40 }}>
          <div><Tag text="Prefrontal cortex" at={0.6} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}><Toggle on={1.2} w={92} /><span style={head(44)}>Include the mind</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}><Counter from={0} to={10} at={1.0} color={BLUE} /><span style={label(26)}>New connections</span></div>
          <div style={{ height: 2, background: RULE }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 26px", borderRadius: 999, background: BLUE, alignSelf: "start", width: "fit-content" }}><Icon name="check" size={30} color="#fff" /><span style={label(26, "#fff")}>Booked</span></div>
        </div>
      </div>
      <Cursor path={[{ at: 0.3, x: 1600, y: 700 }, { at: 1.0, x: 1260, y: 340 }, { at: 1.2, x: 1260, y: 340, tap: true }, { at: 2.4, x: 1500, y: 640 }]} show={[0.3, 4]} />
    </AbsoluteFill>
  );
};
