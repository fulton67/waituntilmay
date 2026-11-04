import css from "../ostad.module.css";
import AnatomyView from "../_components/AnatomyView";
import anatomy from "../data/anatomy.json";
import type { ModelDef } from "../_components/AnatomyScene";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>Anatomy</h1>
      <p className={css.lede}>
        The layered face and the skin block that the overlay animations are built from. Pick a procedure to watch its mechanism play,
        or orbit freely with layers and a cutaway. With the background set to transparent, an exported frame keeps its alpha and drops straight onto filmed video.
      </p>
      <AnatomyView defs={anatomy as unknown as Record<"face" | "skin", ModelDef>} />
    </>
  );
}
