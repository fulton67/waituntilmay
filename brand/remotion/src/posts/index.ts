// Separate entry point for the feed posts, so they render without the shared Root.tsx:
//   npx remotion still src/posts/index.ts Post-FillerScale out.png --frame=95
import { registerRoot } from "remotion";
import { PostsRoot } from "./Root";
registerRoot(PostsRoot);
