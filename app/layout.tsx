import type { Metadata } from "next";
import { Calistoga, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Logo, Wordmark } from "@/components/brand/Wordmark";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

const calistoga = Calistoga({
  variable: "--font-calistoga",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Know Thy VC",
  description: "Sourced pre-meeting investor briefs in under two minutes, powered by Gemini Flash.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${calistoga.variable} ${inter.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <header className="no-print sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
            <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
              <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <Logo />
                <Wordmark />
              </Link>
              <a
                href="https://github.com/kamilzada/know-thy-vc"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                GitHub
              </a>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="no-print border-t border-border">
            <p className="mx-auto max-w-6xl px-4 py-8 font-mono text-xs text-muted-foreground sm:px-6">
              Know Thy VC · Powered by Gemini Flash · Live data via Tavily &amp; Exa web search
            </p>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
