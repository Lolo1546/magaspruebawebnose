import { Globe2, Link2, LockKeyhole, Settings2 } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { Chip } from "@/components/ui/Chip";
import type { ListVisibility, UserList } from "@/data/lists";

import styles from "./ListCard.module.css";

const visibilityDetails: Readonly<
  Record<
    ListVisibility,
    { icon: typeof Globe2; label: string; variant: "default" | "success" }
  >
> = {
  private: { icon: LockKeyhole, label: "Privada", variant: "default" },
  public: { icon: Globe2, label: "Pública", variant: "success" },
  unlisted: { icon: Link2, label: "No listada", variant: "default" },
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function ListCard({ list, view }: { list: UserList; view: "grid" | "list" }) {
  const visibility = visibilityDetails[list.visibility];
  const VisibilityIcon = visibility.icon;

  return (
    <article className={styles.card} data-view={view}>
      <div aria-hidden="true" className={styles.coverPreview}>
        {Array.from({ length: 4 }, (_, index) => {
          const manga = list.previewItems[index];
          return (
            <span key={manga?.id ?? `placeholder-${index}`}>
              {manga?.coverUrl ? (
                <Image
                  alt=""
                  fill
                  sizes="(max-width: 760px) 25vw, 110px"
                  src={manga.coverUrl}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      <div className={styles.body}>
        <div className={styles.topline}>
          <Chip variant={visibility.variant}>
            <VisibilityIcon aria-hidden="true" size={13} />
            {visibility.label}
          </Chip>
          <time dateTime={list.updatedAt}>
            Actualizada {dateFormatter.format(new Date(list.updatedAt))}
          </time>
        </div>
        <h2>
          <Link href={`/listas/${list.id}`}>{list.name}</Link>
        </h2>
        <p>{list.description ?? "Sin descripción."}</p>
        <div className={styles.footer}>
          <span>{list.itemCount === 1 ? "1 manga" : `${list.itemCount} mangas`}</span>
          <Link
            aria-label={`Gestionar ${list.name}`}
            className={styles.manageLink}
            href={`/listas/${list.id}`}
          >
            <Settings2 aria-hidden="true" size={15} />
            Gestionar
          </Link>
        </div>
        {list.previewItems.length ? (
          <ul aria-label={`Mangas en ${list.name}`} className={styles.mangaLinks}>
            {list.previewItems.slice(0, 3).map((manga) => (
              <li key={manga.id}>
                <Link href={`/manga/${manga.slug}`}>{manga.title}</Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
