import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Pipeline" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Under the hood"
      title="How the data flows"
      subtitle="Sources → ingest → features → models → outputs, for the solar and wind pipelines."
      explainer="Each weather feature shows which model consumes it."
    />
  );
}
