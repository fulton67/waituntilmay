// A release cover in the page: next/image's props (srcset from a loader over the files cover-sizes.mjs made, and a
// sizes attribute) on a JPEG <img>, with the same srcset in AVIF as a <source> before it. The loader answers every
// width the browser may ask for with the smallest file at least that wide, so the file is never smaller than the
// rendered width x DPR, up to the largest the cover has. `fixed` pins one file (the expand panel's 3000, the About
// thumbnail's 1024) whatever the width. `jpeg` drops the AVIF source: for a cover that changes while the Rolodex
// turns, since a 2048 AVIF takes 100-150 ms to decode and the frame waits on it (JPEG: a fraction of that).
import { getImageProps, type ImageLoaderProps } from "next/image";
import type { Release } from "@/lib/gillenwebsite/discography";
import { coverFile } from "./shared";

export default function Cover({ r, sizes, className, alt = "", fixed, eager, jpeg, style }: {
  r: Release; sizes: string; className?: string; alt?: string; fixed?: number; eager?: boolean; jpeg?: boolean; style?: React.CSSProperties;
}) {
  const loader = ({ width }: ImageLoaderProps) => coverFile(r, fixed ?? width);
  const top = r.coverSizes.at(-1)!;
  const { props } = getImageProps({ src: r.cover, alt, width: top, height: top, sizes, loader, loading: eager ? "eager" : "lazy", className, style });
  return (
    <picture>
      {!jpeg && <source type="image/avif" srcSet={props.srcSet?.replace(/\.jpg/g, ".avif")} sizes={sizes} />}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes through props */}
      <img {...props} decoding="async" />
    </picture>
  );
}
