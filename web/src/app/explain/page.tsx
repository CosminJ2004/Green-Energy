import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Explain" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Step 2 · Explain"
      title="Why the forecast looks like this"
      subtitle="How each weather feature pushes the forecast up or down, hour by hour."
      explainer="Bars show exact Shapley contributions in MW against a seasonal baseline."
    />
  );
}
