import clsx from "clsx";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import type { Provenance } from "@/lib/api/types";
import { DataProvenanceBadge } from "./Badge";

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small label above the title, e.g. the story step "Step 2 · Explain". */
  eyebrow?: ReactNode;
  /** "What you are looking at" explainer. Collapsible, open by default. */
  explainer?: ReactNode;
  explainerTitle?: string;
  /** Provenance badges for the page's data. */
  provenance?: Provenance | Provenance[];
  actions?: ReactNode;
  className?: string;
}

/** Page title block used at the top of every view. */
export function PageHeader({ title, subtitle, eyebrow, explainer, explainerTitle = "What you are looking at", provenance, actions, className }: PageHeaderProps) {
  const prov = provenance ? (Array.isArray(provenance) ? provenance : [provenance]) : [];
  return (
    <header className={clsx("mb-6 sm:mb-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-4xl">
          {eyebrow && <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-accent-ink">{eyebrow}</p>}
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-fg-muted sm:text-xl">{subtitle}</p>}
        </div>
        {(actions || prov.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {prov.map((p) => (
              <DataProvenanceBadge key={p} provenance={p} size="md" />
            ))}
            {actions}
          </div>
        )}
      </div>
      {explainer && (
        <details open className="group mt-4 max-w-4xl rounded-card border border-border bg-surface-2 px-4 py-3 text-base text-fg-muted">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-fg [&::-webkit-details-marker]:hidden">
            <Info className="size-5 shrink-0 text-info" aria-hidden />
            {explainerTitle}
            <span className="ml-auto text-sm font-normal text-fg-subtle group-open:hidden">Show</span>
            <span className="ml-auto hidden text-sm font-normal text-fg-subtle group-open:inline">Hide</span>
          </summary>
          <div className="mt-2 space-y-2 leading-relaxed">{explainer}</div>
        </details>
      )}
    </header>
  );
}
