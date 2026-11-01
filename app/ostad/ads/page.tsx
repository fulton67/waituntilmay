import css from "../ostad.module.css";
import AdsView from "../_components/AdsView";
import ads from "../data/ads.json";
import type { Ad } from "../_lib/types";

export default function AdsPage() {
  return (
    <>
      <h1 className={css.subject}>Ads that keep running</h1>
      <p className={css.lede}>
        Active US Meta ads for dermatologist, botox, med spa, morpheus8 and skin cancer. Meta hides results, so days running is the proxy: nobody pays to keep a
        losing ad up for months.
      </p>
      <AdsView rows={ads as Ad[]} />
    </>
  );
}
