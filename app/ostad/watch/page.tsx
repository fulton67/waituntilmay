import css from "../ostad.module.css";
import Watch from "../_components/Watch";
import themes from "../data/themes.json";
import videos from "../data/videos.json";
import type { Theme, Video } from "../_lib/types";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>Watch</h1>
      <p className={css.lede}>
        Every video we read. Cards show the first thing said. Open one to play it, read the full transcript and see what it claims. It opens on the videos Dr. Ostad could
        make himself; [show everything] adds the rest.
      </p>
      <Watch videos={videos as Video[]} themes={themes as Theme[]} />
    </>
  );
}
