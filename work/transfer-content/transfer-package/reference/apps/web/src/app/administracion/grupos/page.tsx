import { fetchAdminGroups } from "@/data/admin.server";
import { AdminDirectoryPanel } from "../AdminDirectoryPanel";
import { parseAdminFilters, type AdminSearchParams } from "../directory-page";

export default async function AdminGroupsPage({
  searchParams,
}: {
  readonly searchParams: Promise<AdminSearchParams>;
}) {
  const statuses = [
    "PENDING",
    "VERIFIED",
    "REJECTED",
    "SUSPENDED",
    "CLOSED",
  ] as const;
  const filters = parseAdminFilters(await searchParams, { statuses });
  const data = await fetchAdminGroups(filters);
  return (
    <AdminDirectoryPanel
      kind="scanlation-groups"
      title="Grupos de scanlation"
      subtitle="Autoridad fundadora derivada de membresía activa y rol FOUNDER."
      filters={filters}
      data={data}
      statuses={statuses}
    />
  );
}
