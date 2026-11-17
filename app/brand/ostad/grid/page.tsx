import type { Metadata } from "next";
import Grid from "./Grid";

export const metadata: Metadata = {
  title: "Grid · Ostad brand kit",
  description: "Plan Dr. Ariel Ostad's feed as a grid of tiles from the kit's templates.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// Client-only planner: every tile is the kit's render.html in an iframe (brand/POST_GRID.md §3).
export default function Page() {
  return <Grid />;
}
