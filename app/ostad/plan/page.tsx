import css from "../ostad.module.css";
import PlanView from "../_components/PlanView";
import plan from "../data/plan.json";
import videos from "../data/videos.json";
import type { Plan, Video } from "../_lib/types";

export default function PlanPage() {
  const p = plan as unknown as Plan;
  const ids = new Set([...p.slots, ...p.backups].flatMap((s) => s.refs.map((r) => r.id)));
  const refs = (videos as Video[]).filter((v) => ids.has(v.id));
  return (
    <>
      <h1 className={css.subject}>Four weeks from 9 November</h1>
      <PlanView plan={p} refs={refs} />
    </>
  );
}
