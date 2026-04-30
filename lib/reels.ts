export interface Reel {
  id: string;
  blobUrl: string;
  caption: string;
  postedAt: string;
  order: number;
  weight: 1 | 2 | 3;
  hidden: boolean;
}

// Returns all reels sorted by order, optionally including hidden ones
export async function getReels(includeHidden = false): Promise<Reel[]> {
  const { kv } = await import("@vercel/kv");
  const ids = (await kv.lrange("reels:index", 0, -1)) as string[];
  if (!ids.length) return [];
  const entries = await Promise.all(ids.map((id) => kv.get<Reel>(`reel:${id}`)));
  const reels = entries.filter((r): r is Reel => r !== null);
  return includeHidden ? reels : reels.filter((r) => !r.hidden);
}

export async function setReelOrder(ids: string[]): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.del("reels:index");
  if (ids.length) await kv.rpush("reels:index", ...ids);
}

// Returns true if updated, false if id not found
export async function updateReel(id: string, patch: Partial<Pick<Reel, "weight" | "hidden">>): Promise<boolean> {
  const { kv } = await import("@vercel/kv");
  const existing = await kv.get<Reel>(`reel:${id}`);
  if (!existing) return false;
  await kv.set(`reel:${id}`, { ...existing, ...patch });
  return true;
}

export async function appendReel(reel: Reel): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(`reel:${reel.id}`, reel);
  await kv.rpush("reels:index", reel.id);
}
