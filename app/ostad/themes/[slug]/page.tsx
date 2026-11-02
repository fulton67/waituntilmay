import { notFound } from "next/navigation";
import ThemeView from "../../_components/ThemeView";
import themes from "../../data/themes.json";
import videos from "../../data/videos.json";
import type { Theme, Video } from "../../_lib/types";

const T = themes as Theme[];

export function generateStaticParams() {
  return T.map((t) => ({ slug: t.slug }));
}
export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = T.findIndex((t) => t.slug === slug);
  if (i < 0) notFound();
  return <ThemeView theme={T[i]} videos={videos as Video[]} prev={T[i - 1]} next={T[i + 1]} />;
}
