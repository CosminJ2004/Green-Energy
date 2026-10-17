import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Forecast" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Step 1 · Forecast"
      title="Tomorrow's solar and wind forecast"
      subtitle="48 hours ahead, with the p10–p90 uncertainty band, actuals and baselines."
      explainer="The coloured line is the median forecast (p50); the shaded band is where we expect output 8 times in 10."
    />
  );
}
