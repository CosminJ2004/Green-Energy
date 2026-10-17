import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppShell, ShellFallback } from "@/components/shell/AppShell";
import { AppStateProvider } from "@/lib/state";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Green Energy RO — solar and wind forecasts for Romania", template: "%s · Green Energy RO" },
  description: "Know tomorrow's solar and wind output before it happens: day-ahead forecasts for Romania, explained. Prototype with synthetic demo data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a22" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <Suspense fallback={<ShellFallback />}>
          <AppStateProvider>
            <AppShell>{children}</AppShell>
          </AppStateProvider>
        </Suspense>
      </body>
    </html>
  );
}
