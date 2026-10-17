import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Siting" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Step 4 · AI footprint"
      title="Where could an AI data centre go?"
      subtitle="Weighted criteria rank candidate areas in Romania."
      explainer="Decision support with transparent weights, not an oracle."
    />
  );
}
