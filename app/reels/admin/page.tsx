import type { Metadata } from "next";
import { getReels } from "@/lib/reels";
import ImageHarvestAdmin from "@/components/ImageHarvestAdmin";

export const metadata: Metadata = {
  title: "image harvest 1 — admin",
  robots: { index: false, follow: false },
};

export default async function ReelsAdminPage() {
  const reels = await getReels(true);
  return <ImageHarvestAdmin reels={reels} />;
}
