import { PageContainer } from "@/components/layout/PageContainer";
import type {
  PublicProfile,
  PublicProfileTab,
} from "@/data/public-profiles";

import { ProfileContent, ProfileSidebar } from "./ProfileContent";
import { ProfileHero } from "./ProfileHero";
import { ProfileTabs } from "./ProfileTabs";
import styles from "./PublicProfile.module.css";

export function ProfilePageView({
  profile,
  tab,
}: {
  profile: PublicProfile;
  tab: PublicProfileTab;
}) {
  return (
    <article className={styles.page}>
      <ProfileHero profile={profile} />
      <ProfileTabs activeTab={tab} username={profile.username} />
      <PageContainer className={styles.content}>
        <div className={styles.mainPanel}><ProfileContent profile={profile} tab={tab} /></div>
        <ProfileSidebar profile={profile} />
      </PageContainer>
    </article>
  );
}
