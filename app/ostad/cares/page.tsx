import css from "../ostad.module.css";
import CaresView from "../_components/CaresView";
import cares from "../data/cares.json";
import themes from "../data/themes.json";
import videos from "../data/videos.json";
import type { Care, Theme, Video } from "../_lib/types";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>What people care about</h1>
      <CaresView cares={cares as Care[]} videos={videos as Video[]} themes={themes as Theme[]} />
    </>
  );
}
