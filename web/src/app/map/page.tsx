import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Map" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Step 3 · Act"
      title="Energy map of Romania"
      subtitle="Plants, the 400 kV grid and the regional forecast."
      explainer="Asset positions are approximate and illustrative."
    />
  );
}
