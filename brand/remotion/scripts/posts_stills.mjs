// Render every key frame of the feed posts with ONE bundle (remotion still re-bundles per call).
// usage: node scripts/posts_stills.mjs '<json [[id, [frames...]], ...]>'  -> out/posts/<id>_<n>.png, last key -> out/posts/<id>.png
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const jobs = JSON.parse(process.argv[2]);
const root = path.resolve(import.meta.dirname, "..");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/posts/index.ts"), publicDir: path.join(root, "public") });
for (const [id, keys] of jobs) {
  const composition = await selectComposition({ serveUrl, id: `Post-${id}`, inputProps: {} });
  for (let i = 0; i < keys.length; i++) {
    const name = i < keys.length - 1 ? `${id}_${i + 1}.png` : `${id}.png`;
    await renderStill({ serveUrl, composition, frame: keys[i], output: path.join(root, "out/posts", name), inputProps: {} });
    console.log(name);
  }
}
