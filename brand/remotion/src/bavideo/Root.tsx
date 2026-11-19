import { Composition } from "remotion";
import { BaVideo, DUR, FPS } from "./Reel";
import { WithMe, WM_DUR, WM_FPS } from "./WithMe";

export const BaVideoRoot: React.FC = () => (
  <>
    <Composition id="BaVideoStoryP0005" component={BaVideo} width={1080} height={1920} fps={FPS} durationInFrames={DUR} defaultProps={{ fmt: "story" as const }} />
    <Composition id="BaVideoFeedP0005" component={BaVideo} width={1080} height={1350} fps={FPS} durationInFrames={DUR} defaultProps={{ fmt: "feed" as const }} />
    {/* "With me / Without me" full-screen version, P0053 rosacea (render with --public-dir=<pub from ba_video_p0053.py>) */}
    <Composition id="WithMeStoryP0053" component={WithMe} width={1080} height={1920} fps={WM_FPS} durationInFrames={WM_DUR} defaultProps={{ fmt: "story" as const }} />
    <Composition id="WithMeFeedP0053" component={WithMe} width={1080} height={1350} fps={WM_FPS} durationInFrames={WM_DUR} defaultProps={{ fmt: "feed" as const }} />
  </>
);
