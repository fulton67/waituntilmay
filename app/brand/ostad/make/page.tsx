import type { Metadata } from "next";
import Maker from "./Maker";

export const metadata: Metadata = {
  title: "Make a post · Ostad brand kit",
  description: "Build an on-brand post for Dr. Ariel Ostad from the kit's templates.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// The builder is client-only: the preview is the kit's own render.html in an iframe, so it runs the same template code as the
// server PNG route and brand/post.py (brand/BUILDER.md Phase C).
export default function Page() {
  return <Maker />;
}
