import Link from "next/link";
import { fetchEditorialMangas } from "@/data/editorial.server";
import { mangaTypeLabels } from "@/types/manga-metadata";
import styles from "./EditorialCatalog.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function EditorialMangasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const rawStatus = first(params.status);
  const editorialStatus = rawStatus === "DRAFT" || rawStatus === "PUBLIC" || rawStatus === "HIDDEN" ? rawStatus : undefined;
  const rawPage = Number(first(params.page) ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const data = await fetchEditorialMangas({ q, editorialStatus, page });
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span>Catálogo editorial</span><h1>Fichas de manga</h1><p>Crea, revisa y publica metadata real de MangaZone.</p></div>
        <div className={styles.heroActions}><Link href="/editorial/proyectos">Proyectos de traducción</Link><Link className={styles.primary} href="/editorial/mangas/nuevo">Crear manga</Link></div>
      </header>
      <form className={styles.filters}>
        <label>Buscar<input defaultValue={q} name="q" placeholder="Título o alias" /></label>
        <label>Estado<select defaultValue={editorialStatus ?? ""} name="status"><option value="">Todos</option><option value="DRAFT">Borrador</option><option value="PUBLIC">Público</option><option value="HIDDEN">Oculto</option></select></label>
        <button type="submit">Aplicar filtros</button>
      </form>
      <section className={styles.grid} aria-label="Fichas editoriales">
        {data.items.length ? data.items.map((manga) => (
          <article className={styles.card} key={manga.id}>
            <div className={styles.cover} style={manga.cover?.url ? { backgroundImage: `url(${JSON.stringify(manga.cover.url)})` } : undefined}>{!manga.cover?.url && <span>Sin portada</span>}</div>
            <div className={styles.cardBody}><small>{manga.editorialStatus} · v{manga.version}</small><h2>{manga.title}</h2><p>{mangaTypeLabels[manga.type]} · {manga.demography ?? "Sin demografía"}</p><Link href={`/editorial/mangas/${manga.id}`}>Abrir editor</Link></div>
          </article>
        )) : <p className={styles.empty}>No hay fichas que coincidan con los filtros.</p>}
      </section>
      {data.pagination.pageCount > 1 && <nav className={styles.pagination} aria-label="Paginación"><span>Página {data.pagination.page} de {data.pagination.pageCount}</span>{page > 1 && <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(editorialStatus ? { status: editorialStatus } : {}), page: String(page - 1) })}`}>Anterior</Link>}{page < data.pagination.pageCount && <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(editorialStatus ? { status: editorialStatus } : {}), page: String(page + 1) })}`}>Siguiente</Link>}</nav>}
    </main>
  );
}
