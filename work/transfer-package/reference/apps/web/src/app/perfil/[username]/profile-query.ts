import {
  publicProfileTabs,
  type PublicProfileTab,
} from "@/data/public-profiles";
import {
  firstSearchParamValue,
  isAllowedValue,
  type AppSearchParams,
} from "@/utils/search-params";

export type PublicProfileSearchParams = AppSearchParams;

export const defaultPublicProfileTab: PublicProfileTab = "activity";

export function parsePublicProfileTab(
  searchParams: PublicProfileSearchParams,
): PublicProfileTab {
  const tab = firstSearchParamValue(searchParams.tab);
  return isAllowedValue(tab, publicProfileTabs) ? tab : defaultPublicProfileTab;
}

export function getPublicProfileTabHref(
  username: string,
  tab: PublicProfileTab,
) {
  const pathname = `/perfil/${username}`;
  return tab === defaultPublicProfileTab ? pathname : `${pathname}?tab=${tab}`;
}
