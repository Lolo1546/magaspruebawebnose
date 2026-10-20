"use client";

import { useState } from "react";
import type {
  AdminCommunity,
  AdminDirectoryFilters,
  AdminDirectoryKind,
  AdminList,
  AdminScanlationGroup,
  AdminUser,
} from "@/data/admin";
import {
  fetchAdminCommunity,
  fetchAdminGroup,
  fetchAdminUser,
} from "@/data/admin.client";
import styles from "./AdminShell.module.css";
import { AdminUserMutations } from "./AdminUserMutations";

type Item = AdminUser | AdminCommunity | AdminScanlationGroup;

function identityName(
  value: { displayName: string | null; username: string | null } | null,
): string {
  return value?.displayName ?? value?.username ?? "Sin asignar";
}

function itemKey(kind: AdminDirectoryKind, item: Item): string {
  return kind === "users"
    ? ((item as AdminUser).username ?? "")
    : (item as AdminCommunity).slug;
}

function href(
  kind: AdminDirectoryKind,
  filters: AdminDirectoryFilters,
  page: number,
): string {
  const base =
    kind === "scanlation-groups"
      ? "/administracion/grupos"
      : `/administracion/${kind}`;
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.hasRole) query.set("hasRole", filters.hasRole);
  if (page > 1) query.set("page", String(page));
  const value = query.toString();
  return `${base}${value ? `?${value}` : ""}`;
}

export function AdminDirectoryPanel({
  kind,
  title,
  subtitle,
  filters,
  data,
  statuses,
  currentUsername = null,
  csrfToken = "",
}: {
  readonly kind: AdminDirectoryKind;
  readonly title: string;
  readonly subtitle: string;
  readonly filters: AdminDirectoryFilters;
  readonly data: AdminList<Item>;
  readonly statuses: readonly string[];
  readonly currentUsername?: string | null;
  readonly csrfToken?: string;
}) {
  const [detail, setDetail] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function open(item: Item) {
    setLoading(true);
    setError(null);
    try {
      const key = itemKey(kind, item);
      const response =
        kind === "users"
          ? await fetchAdminUser(key)
          : kind === "communities"
            ? await fetchAdminCommunity(key)
            : await fetchAdminGroup(key);
      setDetail(
        "user" in response
          ? response.user
          : "community" in response
            ? response.community
            : response.group,
      );
    } catch {
      setError("No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>Administración global</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>
      <section className={styles.panel}>
        <form className={styles.toolbar} method="get">
          <label className="sr-only" htmlFor={`${kind}-search`}>
            Buscar
          </label>
          <input
            id={`${kind}-search`}
            name="search"
            defaultValue={filters.search}
            placeholder="Buscar por nombre..."
          />
          <label className="sr-only" htmlFor={`${kind}-status`}>
            Estado
          </label>
          <select
            id={`${kind}-status`}
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          {kind === "users" ? (
            <>
              <label className="sr-only" htmlFor="user-role">
                Rol global
              </label>
              <select
                id="user-role"
                name="hasRole"
                defaultValue={filters.hasRole ?? ""}
              >
                <option value="">Todos los roles</option>
                <option>ADMIN</option>
                <option>MODERATOR</option>
                <option>USER</option>
              </select>
            </>
          ) : null}
          <button type="submit">Aplicar</button>
        </form>
        {data.items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>
                    {kind === "users"
                      ? "Roles"
                      : kind === "communities"
                        ? "Propietario"
                        : "Fundador"}
                  </th>
                  <th>{kind === "users" ? "Alta" : "Miembros activos"}</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const user = kind === "users" ? (item as AdminUser) : null;
                  const entity =
                    kind === "users"
                      ? null
                      : (item as AdminCommunity | AdminScanlationGroup);
                  const authority =
                    kind === "communities"
                      ? (entity as AdminCommunity).owner
                      : kind === "scanlation-groups"
                        ? (entity as AdminScanlationGroup).founder
                        : null;
                  return (
                    <tr key={itemKey(kind, item)}>
                      <td>
                        <strong>
                          {user ? identityName(user) : entity?.name}
                        </strong>
                        <br />
                        <small>
                          {user
                            ? `@${user.username ?? "eliminado"}`
                            : entity?.slug}
                        </small>
                      </td>
                      <td>
                        <span className={styles.badge}>{item.status}</span>
                      </td>
                      <td>
                        {user
                          ? user.roles.join(", ") || "Sin rol"
                          : identityName(authority)}
                      </td>
                      <td>
                        {user
                          ? new Date(user.createdAt).toLocaleDateString("es-PE")
                          : entity?.memberCount}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void open(item)}
                          aria-label={`Ver detalle de ${user?.username ?? entity?.name}`}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No hay resultados para estos filtros.</p>
        )}
        <nav className={styles.pager} aria-label="Paginación">
          <span>
            Página {data.pagination.page} de{" "}
            {Math.max(1, data.pagination.pageCount)}
          </span>
          {data.pagination.page > 1 ? (
            <a href={href(kind, filters, data.pagination.page - 1)}>Anterior</a>
          ) : null}
          {data.pagination.page < data.pagination.pageCount ? (
            <a href={href(kind, filters, data.pagination.page + 1)}>
              Siguiente
            </a>
          ) : null}
        </nav>
      </section>
      {loading ? <p role="status">Cargando detalle...</p> : null}
      {error ? (
        <p role="alert" className={styles.feedback}>
          {error}
        </p>
      ) : null}
      {detail ? (
        <section
          className={`${styles.panel} ${styles.detail}`}
          aria-live="polite"
        >
          <h2>Detalle seguro</h2>
          <div className={styles.detailGrid}>
            {kind === "users" ? (
              <>
                <div>
                  <small>Usuario</small>
                  {identityName(detail as AdminUser)}
                </div>
                <div>
                  <small>Estado de la cuenta</small>
                  {(detail as AdminUser).status}
                </div>
                <div>
                  <small>Fecha de alta</small>
                  {new Date(
                    (detail as AdminUser).createdAt,
                  ).toLocaleDateString("es-PE")}
                </div>
              </>
            ) : (
              <>
                <div>
                  <small>Nombre</small>
                  {(detail as AdminCommunity).name}
                </div>
                <div>
                  <small>Slug</small>
                  {(detail as AdminCommunity).slug}
                </div>
                <div>
                  <small>Miembros activos</small>
                  {(detail as AdminCommunity).memberCount}
                </div>
              </>
            )}
          </div>
          {kind === "users" ? (
            <AdminUserMutations
              user={detail as AdminUser}
              currentUsername={currentUsername}
              csrfToken={csrfToken}
              onRefreshed={setDetail}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
