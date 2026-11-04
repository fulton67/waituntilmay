import Link from "next/link";
import css from "../../ostad.module.css";
import { Blocks } from "../../_components/Md";
import sources from "../../data/refs_sources.json";
import gaps from "../../data/refs_gaps.json";
import type { Block, RefSource } from "../../_lib/types";

export default function Page() {
  const S = sources as RefSource[];
  return (
    <>
      <h1 className={css.subject}>Where these images live</h1>
      <p className={css.lede}>
        {S.filter((s) => s.yield > 0).length} sites gave at least one kept image, ranked by how many. The seed sites that gave nothing are at the
        bottom with what was found there. <Link href="/ostad/refs">[← REFS]</Link>
      </p>
      <div className={css.tableWrap}>
        <table className={css.table} data-testid="sources">
          <thead>
            <tr>
              <th>#</th>
              <th>source</th>
              <th>kind</th>
              <th>kept</th>
              <th>good for</th>
              <th>style</th>
              <th>licence</th>
            </tr>
          </thead>
          <tbody>
            {S.map((s) => (
              <tr key={s.id}>
                <td className={css.n}>{s.rank}</td>
                <td>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                </td>
                <td>{s.kind}</td>
                <td className={css.n}>{s.yield}</td>
                <td>{s.covers}</td>
                <td className={css.mid}>{s.style}</td>
                <td className={css.mid}>{s.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={css.read}>
        <Blocks blocks={gaps as Block[]} />
      </div>
    </>
  );
}
