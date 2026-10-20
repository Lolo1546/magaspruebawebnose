import { CalendarDays, Layers3 } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { Chip } from "@/components/ui/Chip";
import type { ListVisibility, UserListDetail } from "@/data/lists";

import { ListManagement } from "./ListManagement";
import styles from "./ListDetailPage.module.css";

const visibilityLabels: Readonly<Record<ListVisibility, string>> = {
  private: "Privada",
  public: "Pública",
  unlisted: "No listada",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function ListDetailPageView({
  csrfToken,
  list,
}: {
  csrfToken: string;
  list: UserListDetail;
}) {
  const collageItems = list.items.slice(0, 4);

  return (
    <PageContainer className={styles.page}>
      <nav aria-label="Migas de pan" className={styles.breadcrumbs}>
        <Link href="/listas">Listas</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{list.name}</span>
      </nav>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.collage}>
          {Array.from({ length: 4 }, (_, index) => {
            const item = collageItems[index];
            return (
              <span key={item?.manga.id ?? `placeholder-${index}`}>
                {item?.manga.coverUrl ? (
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 760px) 25vw, 150px"
                    src={item.manga.coverUrl}
                  />
                ) : (
                  <Layers3 size={28} strokeWidth={1.2} />
                )}
              </span>
            );
          })}
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Colección personal</p>
          <h1>{list.name}</h1>
          <p className={styles.description}>
            {list.description ?? "Esta lista todavía no tiene descripción."}
          </p>
          <div className={styles.heroMeta}>
            <Chip variant={list.visibility === "public" ? "success" : "default"}>
              {visibilityLabels[list.visibility]}
            </Chip>
            <span>{list.itemCount === 1 ? "1 obra" : `${list.itemCount} obras`}</span>
          </div>
        </div>

        <dl className={styles.dates}>
          <div>
            <dt><CalendarDays aria-hidden="true" size={15} /> Creada</dt>
            <dd><time dateTime={list.createdAt}>{dateFormatter.format(new Date(list.createdAt))}</time></dd>
          </div>
          <div>
            <dt>Actualizada</dt>
            <dd><time dateTime={list.updatedAt}>{dateFormatter.format(new Date(list.updatedAt))}</time></dd>
          </div>
        </dl>
      </section>

      <ListManagement csrfToken={csrfToken} list={list} />
    </PageContainer>
  );
}
