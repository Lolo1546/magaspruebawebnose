import type { ReactNode } from "react";

import styles from "./PageHero.module.css";

export type PageHeroStat = {
  label: string;
  value: ReactNode;
};

export type PageHeroProps = {
  actions?: ReactNode;
  className?: string;
  description: ReactNode;
  eyebrow?: string;
  stats?: readonly PageHeroStat[];
  title: string;
  visual?: ReactNode;
};

export function PageHero({
  actions,
  className,
  description,
  eyebrow,
  stats,
  title,
  visual,
}: PageHeroProps) {
  const heroClassName = [styles.hero, className].filter(Boolean).join(" ");

  return (
    <section className={heroClassName}>
      <div className={styles.content}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.description}>{description}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
        {stats?.length ? (
          <dl className={styles.stats}>
            {stats.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {visual ? (
        <div aria-hidden="true" className={styles.visual}>
          {visual}
        </div>
      ) : null}
    </section>
  );
}
