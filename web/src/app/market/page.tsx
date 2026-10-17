import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Market" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Step 3 · Act"
      title="Production against day-ahead prices"
      subtitle="Negative-price hours and the solar share against price."
      explainer="Descriptive only: no price prediction in v1."
    />
  );
}
