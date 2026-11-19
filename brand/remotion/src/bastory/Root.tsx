import { Composition, staticFile } from "remotion";
import { BaStory, FPS, groupCounts, timeline, type BaGeo, type Fmt } from "./Story";

// BaStoryP0010: 1080x1920 Instagram Story, 30 fps, H.264. Geometry (window size, ring, red-area numbers) comes from
// public/ba-story/p0010.json, written by brand/scripts/ba_story_p0010.py with the two aligned photos. Patient code only.
// the length follows the outline groups (ba_story_outlines.py writes them into p0010.json)
const load = async (props: { geo?: BaGeo; fmt?: Fmt }, fmt: Fmt) => {
  const geo = props.geo ?? ((await (await fetch(staticFile("ba-story/p0010.json"))).json()) as BaGeo);
  return { durationInFrames: Math.round(timeline(groupCounts(geo)).dur * FPS), props: { fmt, geo } };
};

// BaFeedP0010: the same animation re-fit to a 1080x1350 (4:5) feed video.
export const BaStoryRoot: React.FC = () => (
  <>
  <Composition
    id="BaStoryP0010"
    component={BaStory}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={345}
    defaultProps={{} as { geo: BaGeo; fmt?: Fmt }}
    calculateMetadata={({ props }) => load(props, "story")}
  />
  <Composition
    id="BaFeedP0010"
    component={BaStory}
    width={1080}
    height={1350}
    fps={FPS}
    durationInFrames={345}
    defaultProps={{} as { geo: BaGeo; fmt?: Fmt }}
    calculateMetadata={({ props }) => load(props, "feed")}
  />
  </>
);
