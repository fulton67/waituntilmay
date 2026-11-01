import css from "./ostad.module.css";
import Library from "./_components/Library";
import videos from "./data/videos.json";
import analysis from "./data/analysis.json";
import type { Video } from "./_lib/types";

export default function LibraryPage() {
  const vs = videos as Video[];
  const win = vs.filter((v) => v.win && v.rel).length;
  return (
    <>
      <h1 className={css.subject}>What is working</h1>
      <p className={css.lede}>
        {analysis.totals.videos} real videos from TikTok, Instagram and YouTube across cosmetic dermatology, injectables, lasers, skin cancer and derm
        education. Default view:{" "}{win} winners that map to something Ostad offers (top 20% by outlier score on their platform and above the platform median in
        views), sorted by outlier score, meaning views divided by that creator&apos;s usual views. Raw views mostly finds the biggest accounts; outlier score finds the ideas.
      </p>
      <Library videos={vs} />
    </>
  );
}
