import { Composition } from "remotion";
import { BaVideo, DUR, FPS } from "./Reel";

export const BaVideoRoot: React.FC = () => (
  <>
    <Composition id="BaVideoStoryP0005" component={BaVideo} width={1080} height={1920} fps={FPS} durationInFrames={DUR} defaultProps={{ fmt: "story" as const }} />
    <Composition id="BaVideoFeedP0005" component={BaVideo} width={1080} height={1350} fps={FPS} durationInFrames={DUR} defaultProps={{ fmt: "feed" as const }} />
  </>
);
