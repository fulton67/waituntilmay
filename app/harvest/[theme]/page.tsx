import { list } from "@vercel/blob";
import HarvestFeedPage from "@/components/HarvestFeedPage";
import type { HarvestSubmission } from "@/app/api/harvest/submissions/route";

export const dynamic = "force-dynamic";

// Hoarder book absorbs all something-to-eat submissions + its own
const THEME_SOURCES: Record<string, string[]> = {
  "im-starting-to-become-a-hoarder": ["something-to-eat", "im-starting-to-become-a-hoarder"],
};

async function fetchTheme(storageTheme: string): Promise<HarvestSubmission[]> {
  const { blobs } = await list({ prefix: `harvest/${storageTheme}/submissions/` });
  const all = await Promise.all(
    blobs.map(b =>
      fetch(b.url, { cache: "no-store" })
        .then(r => r.json())
        .catch(() => null)
    )
  );
  return (all.filter(Boolean) as HarvestSubmission[]).filter(s => s.visible !== false);
}

async function getSubmissions(theme: string): Promise<HarvestSubmission[]> {
  try {
    const sources = THEME_SOURCES[theme] ?? [theme];
    const batches = await Promise.all(sources.map(fetchTheme));
    const seen = new Set<string>();
    const merged: HarvestSubmission[] = [];
    for (const batch of batches) {
      for (const sub of batch) {
        if (!seen.has(sub.id)) { seen.add(sub.id); merged.push(sub); }
      }
    }
    return merged.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  } catch {
    return [];
  }
}

export default async function Page({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  const submissions = await getSubmissions(theme);
  return <HarvestFeedPage theme={theme} storageTheme={theme} initialSubmissions={submissions} />;
}
