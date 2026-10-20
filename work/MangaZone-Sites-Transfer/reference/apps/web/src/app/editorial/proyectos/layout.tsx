import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/data/auth.server";

export default async function EditorialProjectsLayout({ children }: { children: ReactNode }) {
  if (!await getSession()) redirect("/login");
  return children;
}
