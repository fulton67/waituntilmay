/**
 * Serve config/ffmpeg-filters.plain.json to the filter book.
 *
 * The JSON is imported rather than read off disk so it is bundled with the
 * route and the deployment serves the same file the repository holds. It is
 * about a megabyte of repetitive English and compresses to a fraction of
 * that; the page fetches it once.
 *
 * config/ is the editable copy - scripts/build_filter_plain.py keeps every
 * hand-written entry already in it - so there is no second copy of this
 * anywhere, and nothing to keep in step.
 */
import plain from "@/config/ffmpeg-filters.plain.json";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(plain, {
    headers: {
      // the file only changes when the generator is re-run and committed
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
