import { Composition } from "remotion";
import { SunShade } from "./SunShade";
// Sun Shade Black Friday post: the user's moving blue column gradient (MOVING.md) + the cut-out bottles floating up + sale card.
// npx remotion render src/promo/index.ts SunShadeStory out/sunshade_story.mp4 --gl=angle
// npx remotion render src/promo/index.ts SunShadeFeed  out/sunshade_feed.mp4  --gl=angle
// 12 s = one gradient loop (360 frames at 30 fps).
export const PromoRoot: React.FC = () => (
  <>
    <Composition id="SunShadeStory" component={SunShade} width={1080} height={1920} fps={30} durationInFrames={360} defaultProps={{ fmt: "story" as const }} />
    <Composition id="SunShadeFeed" component={SunShade} width={1080} height={1350} fps={30} durationInFrames={360} defaultProps={{ fmt: "feed" as const }} />
    <Composition id="SunShadeStoryWhite" component={SunShade} width={1080} height={1920} fps={30} durationInFrames={360} defaultProps={{ fmt: "story" as const, bg: "white" as const }} />
    <Composition id="SunShadeFeedWhite" component={SunShade} width={1080} height={1350} fps={30} durationInFrames={360} defaultProps={{ fmt: "feed" as const, bg: "white" as const }} />
  </>
);
