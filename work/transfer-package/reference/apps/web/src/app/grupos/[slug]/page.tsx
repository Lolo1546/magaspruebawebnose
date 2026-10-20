import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchPublicScanlationGroupDetail } from "@/data/scanlation-groups.server";

import { GroupDetailPageView } from "./GroupDetailPageView";

type GroupDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: GroupDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await fetchPublicScanlationGroupDetail(slug);
  if (!group) notFound();

  return {
    description:
      group.description?.slice(0, 160) ??
      `Perfil público de ${group.name} en MangaZone.`,
    title: `${group.name} | Grupos | MangaZone`,
  };
}

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const { slug } = await params;
  const group = await fetchPublicScanlationGroupDetail(slug);
  if (!group) notFound();

  return <GroupDetailPageView group={group} />;
}
