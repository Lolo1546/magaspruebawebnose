import { notFound, redirect } from "next/navigation";
import { getSession } from "@/data/auth.server";
import type { AdminRequestKind, CreationRequestStatus } from "@/data/admin";
import {
  AdminReadError,
  assertAdminAccess,
  fetchAdminCreationRequests,
} from "@/data/admin.server";
import { AdminRequestsPanel } from "./AdminRequestsPanel";

type Params = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Params>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    await assertAdminAccess();
  } catch (error) {
    if (error instanceof AdminReadError && error.status === 401)
      redirect("/login");
    if (error instanceof AdminReadError && error.status === 403) notFound();
    throw error;
  }

  const params = await searchParams;
  const kind: AdminRequestKind =
    first(params.type) === "scanlation-group"
      ? "scanlation-group"
      : "community";
  const rawStatus = first(params.status);
  const status: CreationRequestStatus =
    rawStatus === "NEEDS_INFO" ||
    rawStatus === "APPROVED" ||
    rawStatus === "REJECTED"
      ? rawStatus
      : "PENDING";
  const rawPage = Number(first(params.page) ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const data = await fetchAdminCreationRequests(kind, status, page);
  return (
    <AdminRequestsPanel
      kind={kind}
      status={status}
      data={data}
      csrfToken={session.csrfToken}
    />
  );
}
