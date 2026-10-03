import { Suspense } from "react";
import type { Viewport } from "next";
import WorkPage from "@/components/WorkPage";
import "./work.css";

export const metadata = { title: "work — waituntilmay" };

// Lets the image viewer extend under the notch and home bar and pad itself with env(safe-area-inset-*)
export const viewport: Viewport = { viewportFit: "cover" };

export default function Page() {
  return (
    <Suspense>
      <WorkPage />
    </Suspense>
  );
}
