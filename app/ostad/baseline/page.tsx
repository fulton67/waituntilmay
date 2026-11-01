import css from "../ostad.module.css";
import BaselineView from "../_components/BaselineView";
import own from "../data/own.json";
import videos from "../data/videos.json";
import type { Own, Video } from "../_lib/types";

export default function BaselinePage() {
  const ownVideos = (videos as Video[]).filter((v) => v.src === "own");
  return (
    <>
      <h1 className={css.subject}>Where Ostad is now</h1>
      <BaselineView own={own as unknown as Own} videos={ownVideos} />
    </>
  );
}
