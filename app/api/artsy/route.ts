import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ARTIC = "https://api.artic.edu/api/v1";
const IMG = (id: string) => `https://www.artic.edu/iiif/2/${id}/full/400,/0/default.jpg`;
const FIELDS = "id,title,artist_display,date_display,medium_display,dimensions,image_id,place_of_origin,style_title";
const DETAIL_FIELDS = `${FIELDS},description,credit_line,artwork_type_title,color`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "search";
  const q = searchParams.get("q") ?? "";
  const id = searchParams.get("id") ?? "";

  try {
    if (action === "search") {
      // fetch a larger pool then filter down to those with images
      const params = new URLSearchParams({
        q,
        fields: FIELDS,
        limit: "40",
        "query[term][is_public_domain]": "true",
      });
      const res = await fetch(`${ARTIC}/artworks/search?${params}`);
      const data = await res.json();
      const all = (data.data ?? []).map((w: Record<string, unknown>) => ({
        ...w,
        thumb: w.image_id ? IMG(w.image_id as string) : null,
      }));
      // prioritise results that have an image, but keep the rest too
      const withImage = all.filter((w: Record<string, unknown>) => w.thumb);
      const withoutImage = all.filter((w: Record<string, unknown>) => !w.thumb);
      return NextResponse.json({ results: [...withImage, ...withoutImage].slice(0, 24) });
    }
    if (action === "artwork") {
      const res = await fetch(`${ARTIC}/artworks/${id}?fields=${DETAIL_FIELDS}`);
      const data = await res.json();
      const w = data.data ?? {};
      return NextResponse.json({ ...w, thumb: w.image_id ? IMG(w.image_id as string) : null });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
