import clsx from "clsx";
import type { ReactNode } from "react";
import type { Provenance } from "@/lib/api/types";
import { DataProvenanceBadge } from "./Badge";

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right side of the header (buttons, tabs, legend). */
  actions?: ReactNode;
  /** Shows a provenance badge in the header. */
  provenance?: Provenance;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  bodyClassName?: string;
  id?: string;
  children?: ReactNode;
}

const PAD = { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-7" };

/** Surface container with optional header (title, subtitle, actions, provenance) and footer. */
export function Card({ title, subtitle, actions, provenance, footer, padding = "md", className, bodyClassName, id, children }: CardProps) {
  const hasHeader = title || subtitle || actions || provenance;
  return (
    <section id={id} className={clsx("rounded-card border border-border bg-surface shadow-card", className)}>
      {hasHeader && (
        <header className={clsx("flex flex-wrap items-start justify-between gap-3", padding === "none" ? "p-4" : PAD[padding], "pb-0 sm:pb-0")}>
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold leading-tight text-fg sm:text-xl">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-fg-muted sm:text-base">{subtitle}</p>}
          </div>
          {(actions || provenance) && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {provenance && <DataProvenanceBadge provenance={provenance} compact />}
            </div>
          )}
        </header>
      )}
      <div className={clsx(PAD[padding], hasHeader && padding !== "none" && "pt-3 sm:pt-4", bodyClassName)}>{children}</div>
      {footer && <footer className="border-t border-border px-4 py-3 text-sm text-fg-muted sm:px-5">{footer}</footer>}
    </section>
  );
}
