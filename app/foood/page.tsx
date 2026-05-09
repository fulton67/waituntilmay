import { Suspense } from "react";
import FooodPage from "@/components/FooodPage";

export const metadata = { title: "foood — am shift" };

export default function Page() {
  return (
    <Suspense>
      <FooodPage />
    </Suspense>
  );
}
