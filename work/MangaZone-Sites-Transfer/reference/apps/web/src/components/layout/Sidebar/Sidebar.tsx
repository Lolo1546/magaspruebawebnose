"use client";

import {
  BadgeCheck,
  Compass,
  Flame,
  History,
  Home,
  Image as ImageIcon,
  Library,
  ListChecks,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./Sidebar.module.css";

const primaryItems = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/explorar", icon: Compass, label: "Explorar" },
  { href: "/biblioteca", icon: Library, label: "Biblioteca" },
  { href: "/historial", icon: History, label: "Historial" },
  { href: "/listas", icon: ListChecks, label: "Listas" },
  { href: "/ranking", icon: Trophy, label: "Ranking" },
  { href: "/tendencias", icon: Flame, label: "Tendencias" },
] as const;

const communityItems = [
  { href: "/fanart", icon: ImageIcon, label: "Fan-Art" },
  { href: "/comunidades", icon: Users, label: "Comunidades" },
  { href: "/grupos", icon: BadgeCheck, label: "Grupos" },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  pathname: string;
}) {
  const isActive = isActiveRoute(pathname, href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={[styles.link, isActive && styles.active]
        .filter(Boolean)
        .join(" ")}
      href={href}
      title={label}
    >
      <span className={styles.icon}>
        <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
      <span className={styles.label}>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <nav aria-label="Navegación lateral" className={styles.navigation}>
        <div className={styles.linkGroup}>
          {primaryItems.map((item) => (
            <SidebarLink {...item} key={item.href} pathname={pathname} />
          ))}
        </div>

        <div className={styles.separator} role="separator" />

        <div className={styles.linkGroup}>
          {communityItems.map((item) => (
            <SidebarLink {...item} key={item.href} pathname={pathname} />
          ))}
        </div>

        <div className={styles.bottomGroup}>
          <SidebarLink
            href="/configuracion"
            icon={Settings}
            label="Configuración"
            pathname={pathname}
          />
        </div>
      </nav>
    </aside>
  );
}
