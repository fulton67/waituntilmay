import css from "../ostad.module.css";
import PlanView from "../_components/PlanView";
import plan from "../data/plan.json";
import themes from "../data/themes.json";
import videos from "../data/videos.json";
import type { Plan, Theme, Video } from "../_lib/types";

const P = plan as unknown as Plan;
const ids = new Set([...P.slots, ...P.backups].flatMap((s) => s.refs.map((r) => r.id)));

export default function Page() {
  return (
    <>
      <h1 className={css.subject}>The plan</h1>
      <PlanView plan={P} refs={(videos as Video[]).filter((v) => ids.has(v.id))} themes={themes as Theme[]} />
    </>
  );
}
