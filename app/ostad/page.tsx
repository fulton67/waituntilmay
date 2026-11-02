import css from "./ostad.module.css";
import ReadView from "./_components/ReadView";
import report from "./data/report.json";
import themes from "./data/themes.json";
import videos from "./data/videos.json";
import ads from "./data/ads.json";
import type { Ad, Block, Theme, Video } from "./_lib/types";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>{report.title}</h1>
      <p className={css.lede}>{report.lede}</p>
      <ReadView blocks={report.blocks as Block[]} themes={themes as Theme[]} videos={videos as Video[]} ads={ads as unknown as Ad[]} />
    </>
  );
}
