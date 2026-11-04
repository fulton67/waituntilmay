import css from "../ostad.module.css";
import RefsView from "../_components/RefsView";
import refs from "../data/refs.json";
import procs from "../data/refs_procs.json";
import type { VisRef, RefProc } from "../_lib/types";

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>Visual references</h1>
      <p className={css.lede}>
        Medical-education graphics for every procedure Dr. Ostad performs or talks about: cross-sections, mechanisms, injection maps,
        surgical steps, device diagrams. Each one was looked at and kept only if it is a drawn or rendered graphic, modern, at least 800 px,
        and about this procedure. Licences are as stated on the source page; most are reference only.
      </p>
      <RefsView refs={refs as VisRef[]} procs={procs as RefProc[]} />
    </>
  );
}
