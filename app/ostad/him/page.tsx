import css from "../ostad.module.css";
import HimView from "../_components/HimView";
import him from "../data/him.json";
import themes from "../data/themes.json";
import videos from "../data/videos.json";
import type { Him, Theme, Video } from "../_lib/types";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>Dr. Ostad, today</h1>
      <HimView videos={videos as Video[]} him={him as Him} themes={themes as Theme[]} />
    </>
  );
}
