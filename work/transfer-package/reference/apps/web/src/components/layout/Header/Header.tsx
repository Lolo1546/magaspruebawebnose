"use client";

import { Bell, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import styles from "./Header.module.css";

const primaryLinks = [
  { href: "/", label: "Inicio" },
  { href: "/explorar", label: "Explorar" },
  { href: "/fanart", label: "Fan-Art" },
  { href: "/clips", label: "Clips" },
  { href: "/anime", label: "Anime" },
  { href: "/comunidades", label: "Comunidad" },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (
        isSearchShortcut &&
        window.matchMedia("(min-width: 761px)").matches
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const headerClassName = [styles.header, isScrolled && styles.scrolled]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <Link
        aria-label="MangaZone, ir al inicio"
        className={styles.logo}
        href="/"
      >
        Manga<span>Zone</span>
      </Link>

      <nav aria-label="Navegación principal" className={styles.desktopNav}>
        {primaryLinks.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={[styles.navLink, isActive && styles.active]
                .filter(Boolean)
                .join(" ")}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.actions}>
        <div aria-label="Buscar manga" className={styles.search} role="search">
          <Search aria-hidden="true" size={16} strokeWidth={1.9} />
          <input
            aria-label="Buscar manga"
            autoComplete="off"
            placeholder="Buscar manga…"
            ref={searchInputRef}
            type="search"
          />
          <kbd aria-hidden="true">Ctrl K</kbd>
        </div>

        <Link
          aria-label="Buscar"
          className={`${styles.iconLink} ${styles.mobileSearch}`}
          href="/explorar"
        >
          <Search aria-hidden="true" size={19} strokeWidth={1.9} />
        </Link>

        <Link
          aria-label="Mensajes"
          className={styles.iconLink}
          href="/mensajes"
        >
          <MessageCircle aria-hidden="true" size={19} strokeWidth={1.9} />
        </Link>

        <Link
          aria-label="Notificaciones"
          className={styles.iconLink}
          href="/notificaciones"
        >
          <Bell aria-hidden="true" size={19} strokeWidth={1.9} />
          <span className={styles.notificationDot} aria-hidden="true" />
        </Link>

        <Link className={styles.accessLink} href="/login">
          Acceder
        </Link>
      </div>
    </header>
  );
}
