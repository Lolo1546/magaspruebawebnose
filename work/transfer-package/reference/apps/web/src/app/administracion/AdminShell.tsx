"use client";

import {
  Building2,
  Home,
  Languages,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import type { SessionUser } from "@/data/auth.server";
import styles from "./AdminShell.module.css";

const links = [
  ["/administracion", "Resumen", Home],
  ["/administracion/usuarios", "Usuarios", Users],
  ["/administracion/comunidades", "Comunidades", Building2],
  ["/administracion/grupos", "Grupos", Languages],
  ["/administracion/solicitudes", "Solicitudes", ShieldCheck],
] as const;

export function AdminShell({
  children,
  user,
}: {
  readonly children: ReactNode;
  readonly user: SessionUser;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.app}>
      <aside
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
        aria-label="Navegación administrativa"
      >
        <div className={styles.brand}>
          <span className={styles.mark}>MZ</span>
          <span>
            <strong>MangaZone</strong>
            <small>Administración global</small>
          </span>
        </div>
        <nav className={styles.nav}>
          {links.map(([href, label, Icon]) => {
            const active =
              href === "/administracion"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={active ? styles.active : ""}
              >
                <Icon aria-hidden size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.bottom}>
          <Link href="/moderacion/comunidades">Moderación</Link>
          <Link href="/">Volver a MangaZone</Link>
        </div>
      </aside>
      {open ? (
        <button
          className={styles.overlay}
          aria-label="Cerrar menú desde el fondo"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.menu}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <span className={styles.context}>Consola de control</span>
          <span className={styles.user}>
            {user.displayName ?? user.username}
          </span>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
