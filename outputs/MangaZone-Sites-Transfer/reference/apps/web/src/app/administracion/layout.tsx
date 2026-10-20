import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSession } from "@/data/auth.server";
import { AdminReadError, assertAdminAccess } from "@/data/admin.server";
import { AdminShell } from "./AdminShell";

export default async function AdministrationLayout({
  children,
}: {
  readonly children: ReactNode;
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
  return <AdminShell user={session.user}>{children}</AdminShell>;
}
