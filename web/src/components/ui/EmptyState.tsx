import clsx from "clsx";
import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  /** "error" shows an alert icon and error colour on the icon. */
  tone?: "neutral" | "error";
  className?: string;
}

/** Placeholder for no data, errors and "coming soon". */
export function EmptyState({ title, description, icon, action, tone = "neutral", className }: EmptyStateProps) {
  const Icon = tone === "error" ? CircleAlert : Inbox;
  return (
    <div role={tone === "error" ? "alert" : undefined} className={clsx("flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center", className)}>
      <div className={clsx("mb-3", tone === "error" ? "text-bad" : "text-fg-subtle")}>{icon ?? <Icon className="size-10" aria-hidden />}</div>
      <p className="text-lg font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xl text-base text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
