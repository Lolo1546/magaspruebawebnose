import { fetchAdminCommunities } from "@/data/admin.server";
import { AdminDirectoryPanel } from "../AdminDirectoryPanel";
import { parseAdminFilters, type AdminSearchParams } from "../directory-page";

export default async function AdminCommunitiesPage({
  searchParams,
}: {
  readonly searchParams: Promise<AdminSearchParams>;
}) {
  const statuses = [
    "PENDING",
    "ACTIVE",
    "SUSPENDED",
    "CLOSED",
    "MERGED",
  ] as const;
  const filters = parseAdminFilters(await searchParams, { statuses });
  const data = await fetchAdminCommunities(filters);
  return (
    <AdminDirectoryPanel
      kind="communities"
      title="Comunidades"
      subtitle="Inventario global con propietario canónico y miembros activos."
      filters={filters}
      data={data}
      statuses={statuses}
    />
  );
}
