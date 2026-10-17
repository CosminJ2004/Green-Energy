"use client";

import clsx from "clsx";
import { Menu, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/state";
import { ROUTES } from "@/lib/routes";
import { GlobalControls } from "./GlobalControls";
import { ThemeToggle } from "./ThemeToggle";

export const PRODUCT_NAME = "Green Energy RO";
export const TAGLINE = "Know tomorrow's solar and wind output before it happens";

export function TopNav() {
  const pathname = usePathname();
  const { hrefWith } = useAppState();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={hrefWith("/")} className="flex min-w-0 items-center gap-2.5" aria-label={`${PRODUCT_NAME} home`}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Zap className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight text-fg">{PRODUCT_NAME}</span>
            <span className="hidden truncate text-sm leading-tight text-fg-subtle sm:block">{TAGLINE}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface p-2 text-fg-muted hover:bg-surface-2 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Desktop / tablet navigation */}
      <nav aria-label="Views" className="hidden border-t border-border md:block">
        <ul className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {ROUTES.map((r) => (
            <li key={r.href}>
              <Link
                href={hrefWith(r.href)}
                aria-current={isActive(r.href) ? "page" : undefined}
                className={clsx(
                  "block whitespace-nowrap border-b-[3px] px-3 py-2.5 text-base font-medium transition-colors",
                  isActive(r.href) ? "border-accent text-fg" : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile navigation */}
      {open && (
        <nav id="mobile-nav" aria-label="Views" className="border-t border-border md:hidden">
          <ul className="grid grid-cols-2 gap-1 px-4 py-3">
            {ROUTES.map((r) => (
              <li key={r.href}>
                <Link
                  href={hrefWith(r.href)}
                  aria-current={isActive(r.href) ? "page" : undefined}
                  className={clsx("block rounded-md px-3 py-2.5 text-base font-medium", isActive(r.href) ? "bg-accent-soft text-accent-ink" : "text-fg-muted hover:bg-surface-2")}
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Shared global controls */}
      <div className="border-t border-border bg-surface-2/60">
        <GlobalControls className="mx-auto max-w-[1440px] px-4 py-2 sm:px-6 lg:px-8" />
      </div>
    </header>
  );
}
