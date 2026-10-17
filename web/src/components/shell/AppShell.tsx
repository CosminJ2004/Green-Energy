import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { TopNav } from "./TopNav";

/** Page chrome: sticky nav + global controls, main content column, footer. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-fg">
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** Static fallback while the URL-synced state hydrates (Suspense boundary in the root layout). */
export function ShellFallback() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-[132px] border-b border-border bg-surface" />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-10 w-72 animate-pulse rounded-md bg-surface-3" />
        <div className="mt-6 h-80 animate-pulse rounded-card bg-surface-2" />
      </main>
    </div>
  );
}
