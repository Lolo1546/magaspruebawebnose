import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";

import { AppShellBoundary } from "@/components/layout/AppShellBoundary";
import {
  DEFAULT_THEME,
  THEME_BOOTSTRAP_SCRIPT,
} from "@/utils/theme";

import "../styles/tokens.css";
import "./globals.css";

const inter = Inter({
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  subsets: ["latin"],
  variable: "--font-inter",
  weight: "variable",
});

const bebasNeue = Bebas_Neue({
  display: "swap",
  fallback: ["Impact", "sans-serif"],
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  weight: "400",
});

export const metadata: Metadata = {
  title: "MangaZone — Manga, Manhwa y Manhua",
  description:
    "Descubre Manga, Manhwa y Manhua, consulta actualizaciones y continúa tus lecturas en MangaZone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${inter.variable} ${bebasNeue.variable}`}
      data-scroll-behavior="smooth"
      data-theme={DEFAULT_THEME}
      lang="es"
      suppressHydrationWarning
    >
      <head>
        <script id="theme-bootstrap">{THEME_BOOTSTRAP_SCRIPT}</script>
      </head>
      <body>
        <AppShellBoundary>{children}</AppShellBoundary>
      </body>
    </html>
  );
}
