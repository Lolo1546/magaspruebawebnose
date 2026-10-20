import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicProfile,
  getPublicProfileUsernames,
} from "@/data/public-profiles";

import {
  parsePublicProfileTab,
  type PublicProfileSearchParams,
} from "./profile-query";
import { ProfilePageView } from "./ProfilePageView";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<PublicProfileSearchParams>;
};

export function generateStaticParams() {
  return getPublicProfileUsernames().map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = getPublicProfile(username);
  if (!profile) notFound();

  return {
    title: `${profile.displayName} (@${profile.username}) | MangaZone`,
    description: profile.bio.slice(0, 160),
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: PublicProfilePageProps) {
  const { username } = await params;
  const profile = getPublicProfile(username);
  if (!profile) notFound();

  return (
    <ProfilePageView
      profile={profile}
      tab={parsePublicProfileTab(await searchParams)}
    />
  );
}
