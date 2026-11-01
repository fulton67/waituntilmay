import css from "../ostad.module.css";
import GenresView from "../_components/GenresView";
import analysis from "../data/analysis.json";
import type { Analysis } from "../_lib/types";

export default function GenresPage() {
  return (
    <>
      <h1 className={css.subject}>Genres, formats, hooks</h1>
      <p className={css.lede}>
        Median views, median outlier score and median engagement rate per group, niche videos only (Ostad&apos;s own posts excluded). Click a column to sort. The blue
        line on each bar chart is the all-niche median.
      </p>
      <GenresView a={analysis as unknown as Analysis} />
    </>
  );
}
