import { Construction } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

/** Temporary placeholder page body (replace when the view is built). */
export function ComingSoon({ title, subtitle, eyebrow, explainer }: { title: string; subtitle?: string; eyebrow?: string; explainer?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} explainer={explainer} provenance="synthetic" />
      <EmptyState icon={<Construction className="size-10" aria-hidden />} title="Coming soon" description="This view is being built. The data contract is ready in @/lib/api." />
    </>
  );
}
