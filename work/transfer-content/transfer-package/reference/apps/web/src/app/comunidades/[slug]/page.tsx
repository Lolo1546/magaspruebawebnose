import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/data/auth.server";
import type { SelfCommunityMembership } from "@/data/community-memberships";
import {
  CommunityMembershipsUnauthorizedError,
  fetchSelfCommunityMemberships,
} from "@/data/community-memberships.server";
import {
  fetchPublicCommunityDetail,
  fetchPublicCommunityPosts,
} from "@/data/communities.server";
import {
  firstSearchParamValue,
  type AppSearchParams,
} from "@/utils/search-params";

import { CommunityDetailPageView } from "./CommunityDetailPageView";
import { createCommunityDetailHref } from "./community-detail";

type CommunityDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<AppSearchParams>;
};

type MembershipBootstrap = {
  csrfToken: string | null;
  currentUsername: string | null;
  membership: SelfCommunityMembership | null;
  unavailable: boolean;
};

async function loadMembershipBootstrap(
  slug: string,
): Promise<MembershipBootstrap> {
  let session;
  try {
    session = await getSession();
  } catch {
    return {
      csrfToken: null,
      currentUsername: null,
      membership: null,
      unavailable: true,
    };
  }

  if (!session) {
    return {
      csrfToken: null,
      currentUsername: null,
      membership: null,
      unavailable: false,
    };
  }

  try {
    const memberships = await fetchSelfCommunityMemberships();
    return {
      csrfToken: session.csrfToken,
      currentUsername: session.user.username,
      membership:
        memberships.find((item) => item.community.slug === slug) ?? null,
      unavailable: false,
    };
  } catch (error) {
    if (error instanceof CommunityMembershipsUnauthorizedError) {
      return {
        csrfToken: null,
        currentUsername: null,
        membership: null,
        unavailable: false,
      };
    }
    return {
      csrfToken: session.csrfToken,
      currentUsername: session.user.username,
      membership: null,
      unavailable: true,
    };
  }
}

function parsePostsPage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export async function generateMetadata({
  params,
}: CommunityDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const community = await fetchPublicCommunityDetail(slug);
  if (!community) notFound();
  return {
    description:
      community.description?.slice(0, 160) ??
      `Comunidad pública ${community.name} en MangaZone.`,
    title: `${community.name} | Comunidades | MangaZone`,
  };
}

export default async function CommunityDetailPage({
  params,
  searchParams = Promise.resolve({}),
}: CommunityDetailPageProps) {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const postsPage = parsePostsPage(
    firstSearchParamValue(rawSearchParams.postsPage),
  );
  const [community, membershipBootstrap] = await Promise.all([
    fetchPublicCommunityDetail(slug),
    loadMembershipBootstrap(slug),
  ]);
  if (!community) notFound();

  const posts = await fetchPublicCommunityPosts(slug, {
    page: postsPage,
    pageSize: 10,
  });
  if (!posts) notFound();
  if (posts.total > 0 && postsPage > posts.pageCount) {
    redirect(createCommunityDetailHref(slug, posts.pageCount));
  }

  return (
    <CommunityDetailPageView
      community={community}
      csrfToken={membershipBootstrap.csrfToken}
      currentUsername={membershipBootstrap.currentUsername}
      initialMembership={membershipBootstrap.membership}
      membershipUnavailable={membershipBootstrap.unavailable}
      posts={posts}
    />
  );
}
