import { Composition } from "remotion";
import { FPS, H, W } from "./kit";
import { POSTS } from "./Posts";
import { GRID2 } from "./g2/Grid2";

// Feed posts (brand/POSTS.md): one composition per post, 1080x1350 (4:5), 24 fps. Stills: brand/scripts/posts_render.py.
export const PostsRoot: React.FC = () => (
  <>
    {POSTS.map((p) => (
      <Composition key={p.id} id={`Post-${p.id}`} component={p.C} width={W} height={H} fps={FPS} durationInFrames={p.frames} />
    ))}
    {GRID2.map((p) => (
      <Composition key={p.id} id={`Post-${p.id}`} component={p.C} width={W} height={H} fps={FPS} durationInFrames={p.frames} />
    ))}
  </>
);
