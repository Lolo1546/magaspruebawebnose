"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "../AppShell";

export type AppShellBoundaryProps = {
  readonly children: ReactNode;
};

export function isReaderPath(pathname: string) {
  return /^\/manga\/[^/]+\/capitulo\/[^/]+\/?$/.test(pathname);
}

export function isStandaloneConsolePath(pathname: string) {
  return (
    pathname === "/administracion" || pathname.startsWith("/administracion/")
  );
}

export function AppShellBoundary({ children }: AppShellBoundaryProps) {
  const pathname = usePathname();

  return isReaderPath(pathname) || isStandaloneConsolePath(pathname) ? (
    children
  ) : (
    <AppShell>{children}</AppShell>
  );
}
