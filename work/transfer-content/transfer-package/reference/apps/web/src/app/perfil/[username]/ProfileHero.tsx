import { CalendarDays, MapPin, UserPlus } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { PublicProfile } from "@/data/public-profiles";
import { formatCompactCount } from "@/utils/format-compact-count";

import styles from "./PublicProfile.module.css";

export function ProfileHero({ profile }: { profile: PublicProfile }) {
  const stats = [
    ["Seguidores", profile.stats.followers],
    ["Siguiendo", profile.stats.following],
    ["Obras leídas", profile.stats.readManga],
    ["Reviews", profile.stats.reviews],
    ["Publicaciones", profile.stats.posts],
  ] as const;

  return (
    <section aria-labelledby="public-profile-heading" className={styles.hero}>
      <div className={styles.banner}>
        <Image alt="" fill priority sizes="100vw" src={profile.banner} />
        <span aria-hidden="true" className={styles.bannerShade} />
      </div>

      <div className={styles.identity}>
        <div className={styles.avatar}>
          <Image
            alt={`Avatar de ${profile.displayName}`}
            fill
            sizes="(max-width: 760px) 112px, 156px"
            src={profile.avatar}
          />
        </div>

        <div className={styles.profileCopy}>
          <div className={styles.nameRow}>
            <h1 id="public-profile-heading">{profile.displayName}</h1>
            <div aria-label="Insignias visuales" className={styles.heroBadges}>
              {profile.badges.slice(0, 2).map((badge) => (
                <Chip key={badge} variant="danger">{badge}</Chip>
              ))}
            </div>
          </div>
          <p className={styles.username}>@{profile.username}</p>
          <p className={styles.bio}>{profile.bio}</p>
          <div className={styles.meta}>
            <span><MapPin aria-hidden="true" size={15} />{profile.location}</span>
            <span><CalendarDays aria-hidden="true" size={15} />{profile.joinedLabel}</span>
          </div>
        </div>

        <div className={styles.followArea}>
          <Button aria-describedby="follow-preview-note" disabled>
            <UserPlus aria-hidden="true" size={17} />Seguir
          </Button>
          <p id="follow-preview-note">El seguimiento estará disponible con el futuro sistema social.</p>
        </div>
      </div>

      <dl aria-label="Estadísticas públicas" className={styles.stats}>
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatCompactCount(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
