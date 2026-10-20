import { getPrivateHeaders } from "./auth.server";
import type {
  AdminCommunity,
  AdminCreationRequestList,
  AdminDashboard,
  AdminDirectoryFilters,
  AdminList,
  AdminRequestKind,
  AdminScanlationGroup,
  AdminUser,
  CreationRequestStatus,
} from "./admin";

export class AdminReadError extends Error {
  constructor(readonly status: number) {
    super("No se pudo cargar la consola administrativa.");
    this.name = "AdminReadError";
  }
}

function baseUrl(): string {
  const value = process.env.INTERNAL_API_URL;
  if (!value) throw new AdminReadError(0);
  return value.replace(/\/+$/, "");
}

async function privateJson<T>(path: string): Promise<T> {
  const headers = await getPrivateHeaders();
  if (!headers) throw new AdminReadError(401);
  const response = await fetch(`${baseUrl()}${path}`, {
    cache: "no-store",
    headers,
  });
  if (!response.ok) throw new AdminReadError(response.status);
  return (await response.json()) as T;
}

function queryString(filters: AdminDirectoryFilters): string {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.hasRole) query.set("hasRole", filters.hasRole);
  if (filters.page > 1) query.set("page", String(filters.page));
  const value = query.toString();
  return value ? `?${value}` : "";
}

export function assertAdminAccess(): Promise<{ admin: true }> {
  return privateJson("/admin/access");
}

export function fetchAdminDashboard(): Promise<AdminDashboard> {
  return privateJson("/admin/dashboard");
}

export function fetchAdminUsers(
  filters: AdminDirectoryFilters,
): Promise<AdminList<AdminUser>> {
  return privateJson(`/admin/users${queryString(filters)}`);
}

export function fetchAdminCommunities(
  filters: AdminDirectoryFilters,
): Promise<AdminList<AdminCommunity>> {
  return privateJson(`/admin/communities${queryString(filters)}`);
}

export function fetchAdminGroups(
  filters: AdminDirectoryFilters,
): Promise<AdminList<AdminScanlationGroup>> {
  return privateJson(`/admin/scanlation-groups${queryString(filters)}`);
}

export function fetchAdminCreationRequests(
  kind: AdminRequestKind,
  status: CreationRequestStatus,
  page: number,
): Promise<AdminCreationRequestList> {
  const segment = kind === "community" ? "community" : "scanlation-group";
  const query = new URLSearchParams({ status });
  if (page > 1) query.set("page", String(page));
  return privateJson(
    `/moderation/${segment}-creation-requests?${query.toString()}`,
  );
}
