import { Suspense } from "react";
import WorkPage from "@/components/WorkPage";

export const metadata = { title: "work — waituntilmay" };

export default function Page() {
  return (
    <Suspense>
      <WorkPage />
    </Suspense>
  );
}
