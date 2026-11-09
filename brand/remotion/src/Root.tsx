import { Composition, staticFile } from "remotion";
import { OstadReel } from "./OstadReel";
import { MARKUP_DEMO_SECONDS, MarkupDemo } from "./compositions/MarkupDemo";
import { H, W } from "./brand";
import type { ReelProps } from "./types";

// OstadReel: 1080x1920, 24 fps (video.fps). With no spec passed (Studio), it loads public/rosacea-laser/props.json;
// render another edit with --props=public/<slug>/props.json after `node scripts/prepare.cjs <slug>`.
export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="MarkupDemo" component={MarkupDemo} width={W} height={H} fps={30} durationInFrames={30 * MARKUP_DEMO_SECONDS} defaultProps={{ footage: false }} />
  <Composition id="MarkupOnFootage" component={MarkupDemo} width={W} height={H} fps={30} durationInFrames={30 * MARKUP_DEMO_SECONDS} defaultProps={{ footage: true }} />
  <Composition
    id="OstadReel"
    component={OstadReel}
    width={W}
    height={H}
    fps={24}
    durationInFrames={24 * 10}
    defaultProps={{ spec: null } as ReelProps}
    calculateMetadata={async ({ props }) => {
      const spec = props.spec ?? (await (await fetch(staticFile("rosacea-laser/props.json"))).json()).spec;
      return { durationInFrames: Math.round(spec.durationInSeconds * 24), props: { spec } };
    }}
  />
  </>
);
