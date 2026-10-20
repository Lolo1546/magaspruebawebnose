import Link from "next/link";

import {
  publicProfileTabs,
  type PublicProfileTab,
} from "@/data/public-profiles";

import { getPublicProfileTabHref } from "./profile-query";
import styles from "./PublicProfile.module.css";

const tabLabels: Readonly<Record<PublicProfileTab, string>> = {
  activity: "Actividad",
  library: "Biblioteca pública",
  lists: "Listas",
  reviews: "Reviews",
  posts: "Publicaciones",
};

export function ProfileTabs({
  activeTab,
  username,
}: {
  activeTab: PublicProfileTab;
  username: string;
}) {
  return (
    <nav aria-label="Secciones del perfil" className={styles.tabs}>
      {publicProfileTabs.map((tab) => (
        <Link
          aria-current={activeTab === tab ? "page" : undefined}
          href={getPublicProfileTabHref(username, tab)}
          key={tab}
        >
          {tabLabels[tab]}
        </Link>
      ))}
    </nav>
  );
}
