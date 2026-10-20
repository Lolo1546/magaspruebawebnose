"use client";

import { Bookmark, Compass, Home, Library, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./MobileBottomNav.module.css";

const items = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/explorar", icon: Compass, label: "Explorar" },
  { href: "/biblioteca", icon: Library, label: "Biblioteca" },
  { href: "/listas", icon: Bookmark, label: "Listas" },
  { href: "/perfil", icon: User, label: "Perfil" },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return href === "/" || href === "/perfil"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación móvil" className={styles.navigation}>
      {items.map(({ href, icon: Icon, label }) => {
        const isActive = isActiveRoute(pathname, href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[styles.link, isActive && styles.active]
              .filter(Boolean)
              .join(" ")}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
