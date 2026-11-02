import css from "../ostad.module.css";
import { ThemeIndex } from "../_components/ThemeView";
import themes from "../data/themes.json";
import type { Theme } from "../_lib/types";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>Themes</h1>
      <p className={css.lede}>
        What the niche is actually talking about. Videos were grouped by what they say, then read and named. Biggest first.
      </p>
      <ThemeIndex themes={themes as Theme[]} />
    </>
  );
}
