import { fetchAdminUsers } from "@/data/admin.server";
import { getSession } from "@/data/auth.server";
import { AdminDirectoryPanel } from "../AdminDirectoryPanel";
import { parseAdminFilters, type AdminSearchParams } from "../directory-page";

export default async function AdminUsersPage({
  searchParams,
}: {
  readonly searchParams: Promise<AdminSearchParams>;
}) {
  const statuses = [
    "ACTIVE",
    "PENDING_VERIFICATION",
    "SUSPENDED",
    "PENDING_DELETION",
    "DELETED",
  ] as const;
  const filters = parseAdminFilters(await searchParams, {
    statuses,
    roles: ["ADMIN", "MODERATOR", "USER"],
  });
  const session = await getSession();
  const data = await fetchAdminUsers(filters);
  return (
    <AdminDirectoryPanel
      kind="users"
      title="Usuarios"
      subtitle="Roles globales y permisos directos se muestran como fuentes separadas."
      filters={filters}
      data={data}
      statuses={statuses}
      currentUsername={session?.user.username ?? null}
      csrfToken={session?.csrfToken ?? ""}
    />
  );
}
