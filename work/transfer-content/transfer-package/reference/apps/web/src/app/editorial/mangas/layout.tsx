import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/data/auth.server";
import { assertEditorialAccess, EditorialReadError } from "@/data/editorial.server";

export default async function EditorialLayout({ children }: { readonly children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    await assertEditorialAccess();
  } catch (error) {
    if (error instanceof EditorialReadError && error.status === 401) redirect("/login");
    if (error instanceof EditorialReadError && error.status === 403) notFound();
    throw error;
  }
  return children;
}
