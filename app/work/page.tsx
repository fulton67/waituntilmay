import { Suspense } from "react";
import WorkPage from "@/components/WorkPage";
import "./work.css";

export const metadata = { title: "work — waituntilmay" };

export default function Page() {
  return (
    <Suspense>
      <WorkPage />
    </Suspense>
  );
}
