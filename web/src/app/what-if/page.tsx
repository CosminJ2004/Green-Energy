import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "What-if" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Step 2 · Explain"
      title="What if the weather changes?"
      subtitle="Move the sliders and watch the forecast respond."
      explainer="Inputs are correlated in reality, so results are illustrative."
    />
  );
}
