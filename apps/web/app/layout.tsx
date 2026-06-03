import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { siteConfig } from "@/config/site";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="resize-observer-error-guard" strategy="beforeInteractive">
          {`
            (() => {
              const ignoredMessages = new Set([
                "ResizeObserver loop completed with undelivered notifications.",
                "ResizeObserver loop limit exceeded"
              ]);
              const isIgnored = (value) => ignoredMessages.has(String(value && value.message ? value.message : value));
              window.addEventListener("error", (event) => {
                if (!isIgnored(event.message) && !isIgnored(event.error)) return;
                event.preventDefault();
                event.stopImmediatePropagation();
              }, true);
              window.addEventListener("unhandledrejection", (event) => {
                if (!isIgnored(event.reason)) return;
                event.preventDefault();
                event.stopImmediatePropagation();
              }, true);
            })();
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
