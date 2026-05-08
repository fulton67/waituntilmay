import { list } from "@vercel/blob";
import HarvestIndexPage from "@/components/HarvestIndexPage";
import { BOOKS, ANTHOLOGY_SLUG, ANTHOLOGY_TITLE } from "@/lib/books";

export const dynamic = "force-dynamic";

async function getCount(slug: string): Promise<number> {
  try {
    const { blobs } = await list({ prefix: `harvest/${slug}/submissions/` });
    return blobs.length;
  } catch {
    return 0;
  }
}

async function getCover(slug: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: `harvest/${slug}/images/`, limit: 1 });
    return blobs[0]?.url ?? null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const books = await Promise.all(
    BOOKS.map(async b => ({
      ...b,
      count: await getCount(b.slug),
      cover: await getCover(b.slug),
    }))
  );

  const anthologyCount = books.reduce((sum, b) => sum + b.count, 0);

  return (
    <HarvestIndexPage
      books={books}
      anthologySlug={ANTHOLOGY_SLUG}
      anthologyTitle={ANTHOLOGY_TITLE}
      anthologyCount={anthologyCount}
    />
  );
}
