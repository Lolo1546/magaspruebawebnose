import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/data/auth.server";
import {
  fetchListDetail,
  ListsUnauthorizedError,
} from "@/data/lists.server";

import { ListDetailPageView } from "./ListDetailPageView";

type ListDetailPageProps = {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function parsePage(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d+$/.test(rawValue)) return 1;
  const page = Number(rawValue);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

async function resolveList(listId: string, page: number) {
  try {
    const list = await fetchListDetail(listId, page);
    if (!list) notFound();
    return list;
  } catch (error) {
    if (error instanceof ListsUnauthorizedError) return redirect("/login");
    throw error;
  }
}

export async function generateMetadata({
  params,
}: ListDetailPageProps): Promise<Metadata> {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { listId } = await params;
  const list = await resolveList(listId, 1);

  return {
    title: `${list.name} | MangaZone`,
    description:
      list.description?.slice(0, 160) ??
      `Gestiona la lista ${list.name} en MangaZone.`,
  };
}

export default async function ListDetailPage({
  params,
  searchParams,
}: ListDetailPageProps) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const [{ listId }, query] = await Promise.all([params, searchParams]);
  const list = await resolveList(listId, parsePage(query.page));

  return <ListDetailPageView csrfToken={session.csrfToken} list={list} />;
}
