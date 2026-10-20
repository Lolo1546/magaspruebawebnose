import 'dotenv/config';

import {
  PrismaClient,
  MangaType,
  MangaStatus,
  ContentRating,
  ChapterKind,
  ChapterStatus,
  ChapterReleaseStatus,
  ContributionType,
  ScanlationGroupStatus,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityStatus,
  PostStatus,
} from '../generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  assertSafeDevelopmentIdentityCollision,
  assertSafeCatalogSeedTarget,
  developmentIdentities,
  type DevelopmentIdentitySeed,
} from './seed-support.js';
import { provisionGlobalAuthorizationCatalog } from './global-authorization-catalog.js';

const connectionString = assertSafeCatalogSeedTarget(
  process.env.DATABASE_URL,
  process.env.NODE_ENV,
);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const demoGenres = [
  { slug: 'accion', name: 'Acción' },
  { slug: 'aventura', name: 'Aventura' },
  { slug: 'comedia', name: 'Comedia' },
  { slug: 'deportes', name: 'Deportes' },
  { slug: 'drama', name: 'Drama' },
  { slug: 'fantasia', name: 'Fantasía' },
  { slug: 'misterio', name: 'Misterio' },
  { slug: 'romance', name: 'Romance' },
  { slug: 'sobrenatural', name: 'Sobrenatural' },
  { slug: 'terror', name: 'Terror' },
];

const demoCatalog = [
  {
    slug: 'solo-leveling',
    title: 'Solo Leveling',
    originalTitle: '나 혼자만 레벨업',
    type: MangaType.MANHWA,
    status: MangaStatus.COMPLETED,
    year: 2018,
    genres: ['accion', 'fantasia'],
    latestChapter: 202,
    aliases: ['Na Honjaman Level Up', 'I Level Up Alone'],
    author: 'Chugong',
    artist: 'Jang Sung-rak',
  },
  {
    slug: 'one-piece',
    title: 'One Piece',
    originalTitle: 'ONE PIECE',
    type: MangaType.MANGA,
    status: MangaStatus.ONGOING,
    year: 1997,
    genres: ['aventura', 'comedia'],
    latestChapter: 1121,
    aliases: ['OP', 'Wan Pīsu'],
    author: 'Eiichiro Oda',
    artist: 'Eiichiro Oda',
  },
  {
    slug: 'omniscient-reader',
    title: 'Omniscient Reader',
    originalTitle: '전지적 독자 시점',
    type: MangaType.MANHWA,
    status: MangaStatus.ONGOING,
    year: 2020,
    genres: ['fantasia', 'accion'],
    latestChapter: 219,
    aliases: ['ORV', "Omniscient Reader's Viewpoint"],
    author: 'singNsong',
    artist: 'Sleepy-C',
  },
  {
    slug: 'blue-lock',
    title: 'Blue Lock',
    originalTitle: 'ブルーロック',
    type: MangaType.MANGA,
    status: MangaStatus.ONGOING,
    year: 2018,
    genres: ['deportes', 'drama'],
    latestChapter: 271,
    aliases: ['Blue Lock Project'],
    author: 'Muneyuki Kaneshiro',
    artist: 'Yusuke Nomura',
  },
  {
    slug: 'frieren',
    title: 'Frieren: Más allá del final',
    originalTitle: '葬送のフリーレン',
    type: MangaType.MANGA,
    status: MangaStatus.PAUSED,
    year: 2020,
    genres: ['fantasia', 'aventura'],
    latestChapter: 132,
    aliases: ['Frieren at the Funeral', 'Sousou no Frieren'],
    author: 'Kanehito Yamada',
    artist: 'Tsukasa Abe',
  },
  {
    slug: 'the-horizon',
    title: 'The Horizon',
    type: MangaType.MANHWA,
    status: MangaStatus.COMPLETED,
    year: 2016,
    genres: ['drama'],
    latestChapter: 21,
  },
  {
    slug: 'dandadan',
    title: 'Dandadan',
    type: MangaType.MANGA,
    status: MangaStatus.ONGOING,
    year: 2021,
    genres: ['sobrenatural', 'comedia'],
    latestChapter: 163,
  },
  {
    slug: 'seasons-of-blossom',
    title: 'Seasons of Blossom',
    type: MangaType.MANHWA,
    status: MangaStatus.COMPLETED,
    year: 2020,
    genres: ['romance', 'drama'],
    latestChapter: 130,
  },
  {
    slug: 'bastard',
    title: 'Bastard',
    type: MangaType.MANHWA,
    status: MangaStatus.COMPLETED,
    year: 2014,
    genres: ['terror', 'misterio'],
    latestChapter: 94,
  },
  {
    slug: 'witch-hat-atelier',
    title: 'Witch Hat Atelier',
    type: MangaType.MANGA,
    status: MangaStatus.ONGOING,
    year: 2016,
    genres: ['fantasia', 'aventura'],
    latestChapter: 79,
  },
  {
    slug: 'skip-and-loafer',
    title: 'Skip and Loafer',
    type: MangaType.MANGA,
    status: MangaStatus.ONGOING,
    year: 2018,
    genres: ['comedia', 'romance'],
    latestChapter: 62,
  },
  {
    slug: 'legend-of-the-northern-blade',
    title: 'Legend of the Northern Blade',
    type: MangaType.MANHWA,
    status: MangaStatus.COMPLETED,
    year: 2019,
    genres: ['accion', 'aventura'],
    latestChapter: 192,
  },
  {
    slug: 'the-gods-game',
    title: "The God's Game",
    type: MangaType.MANHUA,
    status: MangaStatus.ONGOING,
    year: 2022,
    genres: ['accion', 'fantasia'],
    latestChapter: 84,
  },
  {
    slug: 'song-of-the-long-march',
    title: 'Song of the Long March',
    type: MangaType.MANHUA,
    status: MangaStatus.PAUSED,
    year: 2011,
    genres: ['drama', 'aventura'],
    latestChapter: 61,
  },
  {
    slug: 'nan-hao-and-shang-feng',
    title: 'Nan Hao & Shang Feng',
    type: MangaType.MANHUA,
    status: MangaStatus.ONGOING,
    year: 2017,
    genres: ['comedia'],
    latestChapter: 119,
  },
  {
    slug: 'orange',
    title: 'Orange',
    type: MangaType.MANGA,
    status: MangaStatus.COMPLETED,
    year: 2012,
    genres: ['romance', 'drama'],
    latestChapter: 31,
  },
  {
    slug: 'spirit-fingers',
    title: 'Spirit Fingers',
    type: MangaType.MANHWA,
    status: MangaStatus.COMPLETED,
    year: 2015,
    genres: ['romance', 'comedia'],
    latestChapter: 167,
  },
  {
    slug: 'summer-time-rendering',
    title: 'Summer Time Rendering',
    type: MangaType.MANGA,
    status: MangaStatus.COMPLETED,
    year: 2017,
    genres: ['misterio', 'sobrenatural'],
    latestChapter: 139,
  },
];

const demoGroups = [
  { slug: 'luna-translation', name: 'Luna Translation' },
  { slug: 'nebula-scan', name: 'Nébula Scan' },
];

const demoGroupVerifiedAt = new Date('2026-01-01T00:00:00.000Z');

const chapterTitles = [
  'El umbral',
  'Una promesa pendiente',
  'Señales en la distancia',
  'La decisión',
  'Antes del amanecer',
  'Un nuevo rumbo',
];

const demoCommunities = [
  {
    slug: 'lectores-nocturnos',
    name: 'Lectores Nocturnos',
    description: 'Un espacio para compartir lecturas que no dejan dormir.',
    owner: 'luna' as const,
    relatedMangaSlug: 'bastard',
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    ownerMembershipId: '019c2000-0000-7000-8000-000000000001',
  },
  {
    slug: 'club-manga-lima',
    name: 'Club Manga Lima',
    description: 'Conversaciones abiertas sobre manga y lectura en Lima.',
    owner: 'norte' as const,
    relatedMangaSlug: null,
    createdAt: new Date('2026-02-02T00:00:00.000Z'),
    ownerMembershipId: '019c2000-0000-7000-8000-000000000002',
  },
  {
    slug: 'archivo-seinen',
    name: 'Archivo Seinen',
    description: 'Análisis y recomendaciones de historias seinen.',
    owner: 'luna' as const,
    relatedMangaSlug: 'the-horizon',
    createdAt: new Date('2026-02-03T00:00:00.000Z'),
    ownerMembershipId: '019c2000-0000-7000-8000-000000000003',
  },
] as const;

const demoCommunityPosts = [
  {
    id: '019c3000-0000-7000-8000-000000000001',
    communitySlug: 'lectores-nocturnos',
    author: 'luna' as const,
    title: 'Bienvenidos a Lectores Nocturnos',
    body: 'Compartamos historias intensas y recomendaciones para la próxima lectura.',
    isSpoiler: false,
    createdAt: new Date('2026-02-04T00:00:00.000Z'),
  },
  {
    id: '019c3000-0000-7000-8000-000000000002',
    communitySlug: 'lectores-nocturnos',
    author: 'norte' as const,
    title: 'Lectura de la semana',
    body: 'Esta semana comentaremos Bastard respetando las marcas de spoiler.',
    isSpoiler: true,
    createdAt: new Date('2026-02-05T00:00:00.000Z'),
  },
  {
    id: '019c3000-0000-7000-8000-000000000003',
    communitySlug: 'club-manga-lima',
    author: 'norte' as const,
    title: 'Presentaciones del club',
    body: 'Cuéntanos qué género disfrutas y cuál fue tu primera lectura.',
    isSpoiler: false,
    createdAt: new Date('2026-02-06T00:00:00.000Z'),
  },
  {
    id: '019c3000-0000-7000-8000-000000000004',
    communitySlug: 'club-manga-lima',
    author: 'luna' as const,
    title: 'Recomendaciones locales',
    body: 'Abrimos este hilo para intercambiar recomendaciones sin spoilers.',
    isSpoiler: false,
    createdAt: new Date('2026-02-07T00:00:00.000Z'),
  },
  {
    id: '019c3000-0000-7000-8000-000000000005',
    communitySlug: 'archivo-seinen',
    author: 'luna' as const,
    title: 'Cómo leer una obra breve',
    body: 'Analizamos ritmo, silencios y estructura en relatos compactos.',
    isSpoiler: false,
    createdAt: new Date('2026-02-08T00:00:00.000Z'),
  },
  {
    id: '019c3000-0000-7000-8000-000000000006',
    communitySlug: 'archivo-seinen',
    author: 'norte' as const,
    title: 'Debate mensual',
    body: 'Proponemos temas para el próximo análisis colectivo.',
    isSpoiler: false,
    createdAt: new Date('2026-02-09T00:00:00.000Z'),
  },
] as const;

async function ensureDevelopmentIdentity(identity: DevelopmentIdentitySeed) {
  const existing = await prisma.user.findUnique({
    where: { usernameNormalized: identity.usernameNormalized },
    select: {
      email: true,
      emailNormalized: true,
      emailVerifiedAt: true,
      passwordHash: true,
      _count: { select: { roles: true } },
    },
  });

  assertSafeDevelopmentIdentityCollision(
    identity.username,
    existing
      ? {
          email: existing.email,
          emailNormalized: existing.emailNormalized,
          emailVerifiedAt: existing.emailVerifiedAt,
          passwordHash: existing.passwordHash,
          roleCount: existing._count.roles,
        }
      : null,
  );

  const user = await prisma.user.upsert({
    where: { usernameNormalized: identity.usernameNormalized },
    update: {
      status: identity.status,
      username: identity.username,
      usernameNormalized: identity.usernameNormalized,
    },
    create: {
      createdAt: identity.createdAt,
      email: identity.email,
      emailNormalized: identity.emailNormalized,
      emailVerifiedAt: identity.emailVerifiedAt,
      passwordHash: identity.passwordHash,
      status: identity.status,
      username: identity.username,
      usernameNormalized: identity.usernameNormalized,
    },
    select: { id: true },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { displayName: identity.displayName },
    create: {
      createdAt: identity.createdAt,
      displayName: identity.displayName,
      userId: user.id,
    },
  });

  return user;
}

async function ensureDevelopmentIdentities() {
  const [lunaIdentity, norteIdentity] = developmentIdentities;
  const lunaUser = await ensureDevelopmentIdentity(lunaIdentity);
  const norteUser = await ensureDevelopmentIdentity(norteIdentity);

  return { lunaUser, norteUser };
}

async function ensureDevelopmentCommunities(
  identities: Awaited<ReturnType<typeof ensureDevelopmentIdentities>>,
) {
  const mangaBySlug = new Map(
    (
      await prisma.manga.findMany({
        where: {
          slug: {
            in: demoCommunities.flatMap((community) =>
              community.relatedMangaSlug ? [community.relatedMangaSlug] : [],
            ),
          },
        },
        select: { id: true, slug: true },
      })
    ).map((manga) => [manga.slug, manga.id]),
  );
  const communityIds = new Map<string, string>();

  for (const definition of demoCommunities) {
    const ownerUserId =
      definition.owner === 'luna'
        ? identities.lunaUser.id
        : identities.norteUser.id;
    const relatedMangaId = definition.relatedMangaSlug
      ? mangaBySlug.get(definition.relatedMangaSlug)
      : null;

    if (definition.relatedMangaSlug && !relatedMangaId) {
      throw new Error(
        `Missing catalog manga required by community seed: ${definition.relatedMangaSlug}`,
      );
    }

    const community = await prisma.$transaction(async (transaction) => {
      const record = await transaction.community.upsert({
        where: { slug: definition.slug },
        update: {
          description: definition.description,
          name: definition.name,
          nameNormalized: definition.name.toUpperCase(),
          ownerUserId,
          relatedMangaId,
          status: CommunityStatus.ACTIVE,
        },
        create: {
          createdAt: definition.createdAt,
          description: definition.description,
          name: definition.name,
          nameNormalized: definition.name.toUpperCase(),
          ownerUserId,
          relatedMangaId,
          slug: definition.slug,
          status: CommunityStatus.ACTIVE,
        },
      });

      await transaction.communityMember.upsert({
        where: { id: definition.ownerMembershipId },
        update: {
          communityId: record.id,
          leftAt: null,
          role: CommunityMemberRole.OWNER,
          status: CommunityMemberStatus.ACTIVE,
          userId: ownerUserId,
        },
        create: {
          id: definition.ownerMembershipId,
          communityId: record.id,
          joinedAt: definition.createdAt,
          role: CommunityMemberRole.OWNER,
          status: CommunityMemberStatus.ACTIVE,
          userId: ownerUserId,
        },
      });

      return record;
    });

    communityIds.set(definition.slug, community.id);
  }

  const nocturnalCommunityId = communityIds.get('lectores-nocturnos');
  if (!nocturnalCommunityId) {
    throw new Error('Missing reserved development community.');
  }
  await prisma.communityMember.upsert({
    where: { id: '019c2000-0000-7000-8000-000000000004' },
    update: {
      communityId: nocturnalCommunityId,
      leftAt: null,
      role: CommunityMemberRole.MEMBER,
      status: CommunityMemberStatus.ACTIVE,
      userId: identities.norteUser.id,
    },
    create: {
      id: '019c2000-0000-7000-8000-000000000004',
      communityId: nocturnalCommunityId,
      joinedAt: new Date('2026-02-04T00:00:00.000Z'),
      role: CommunityMemberRole.MEMBER,
      status: CommunityMemberStatus.ACTIVE,
      userId: identities.norteUser.id,
    },
  });

  for (const definition of demoCommunityPosts) {
    const communityId = communityIds.get(definition.communitySlug);
    if (!communityId) {
      throw new Error('Missing reserved development community for post seed.');
    }
    const authorUserId =
      definition.author === 'luna'
        ? identities.lunaUser.id
        : identities.norteUser.id;

    await prisma.post.upsert({
      where: { id: definition.id },
      update: {
        authorUserId,
        body: definition.body,
        communityId,
        isSpoiler: definition.isSpoiler,
        status: PostStatus.PUBLISHED,
        title: definition.title,
      },
      create: {
        id: definition.id,
        authorUserId,
        body: definition.body,
        communityId,
        createdAt: definition.createdAt,
        isSpoiler: definition.isSpoiler,
        status: PostStatus.PUBLISHED,
        title: definition.title,
      },
    });
  }
}

async function main() {
  console.log('🌱 Starting development catalog seed...');

  await provisionGlobalAuthorizationCatalog({
    upsertRole: (entry) =>
      prisma.role.upsert({
        where: { key: entry.key },
        update: {
          name: entry.name,
          description: entry.description,
        },
        create: entry,
        select: { id: true },
      }),
    upsertPermission: (entry) =>
      prisma.permission.upsert({
        where: { key: entry.key },
        update: { description: entry.description },
        create: entry,
        select: { id: true },
      }),
    upsertRolePermission: async (roleId, permissionId) => {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    },
  });

  const developmentIdentityRecords = await ensureDevelopmentIdentities();

  // 1. Upsert Genres
  for (const g of demoGenres) {
    await prisma.genre.upsert({
      where: { slug: g.slug },
      update: { name: g.name },
      create: { slug: g.slug, name: g.name },
    });
  }

  // 2. Upsert Placeholder Cover Asset
  const coverAsset = await prisma.asset.upsert({
    where: { storageKey: '/demo/cover-placeholder.svg' },
    update: {},
    create: {
      storageKey: '/demo/cover-placeholder.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 1024,
      width: 400,
      height: 600,
      status: 'READY',
    },
  });

  const readerPageAsset = await prisma.asset.upsert({
    where: { storageKey: '/demo/reader-page-placeholder.svg' },
    update: {
      mimeType: 'image/svg+xml',
      sizeBytes: 1414,
      width: 900,
      height: 1300,
      status: 'READY',
    },
    create: {
      storageKey: '/demo/reader-page-placeholder.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 1414,
      width: 900,
      height: 1300,
      status: 'READY',
    },
  });

  // 2.1 Upsert Scanlation Groups
  const groupRecords: Record<string, string> = {};
  for (const group of demoGroups) {
    const record = await prisma.scanlationGroup.upsert({
      where: { slug: group.slug },
      update: {
        name: group.name,
        nameNormalized: group.name.toUpperCase(),
        status: ScanlationGroupStatus.VERIFIED,
        verifiedAt: demoGroupVerifiedAt,
      },
      create: {
        slug: group.slug,
        name: group.name,
        nameNormalized: group.name.toUpperCase(),
        language: 'es-LA',
        status: ScanlationGroupStatus.VERIFIED,
        verifiedAt: demoGroupVerifiedAt,
      },
    });
    groupRecords[group.slug] = record.id;
  }

  // 3. Upsert Mangas
  for (const m of demoCatalog) {
    const manga = await prisma.manga.upsert({
      where: { slug: m.slug },
      update: {
        title: m.title,
        type: m.type,
        status: m.status,
        publicationYear: m.year,
        coverAssetId: coverAsset.id,
      },
      create: {
        slug: m.slug,
        title: m.title,
        originalTitle: m.originalTitle,
        type: m.type,
        status: m.status,
        publicationYear: m.year,
        contentRating: ContentRating.GENERAL,
        coverAssetId: coverAsset.id,
        description: `${m.title} es una obra incluida como contenido local de demostración para la ficha de MangaZone.`,
      },
    });

    // Link Aliases
    if (m.aliases) {
      await prisma.mangaAlias.deleteMany({ where: { mangaId: manga.id } });
      for (const alias of m.aliases) {
        await prisma.mangaAlias.create({
          data: {
            mangaId: manga.id,
            alias,
            normalizedAlias: alias.toUpperCase(),
          },
        });
      }
    }

    // Link Creators
    await prisma.mangaCreator.deleteMany({ where: { mangaId: manga.id } });
    if (m.author) {
      const author = await prisma.creator
        .upsert({
          where: { name: m.author, id: '00000000-0000-0000-0000-000000000000' }, // Dummy id for upsert to fail cleanly and create
          update: {},
          create: { name: m.author, normalizedName: m.author.toUpperCase() },
        })
        .catch(async () => {
          // Since we don't have a unique constraint on name alone, we find first or create
          let c = await prisma.creator.findFirst({ where: { name: m.author } });
          if (!c)
            c = await prisma.creator.create({
              data: { name: m.author, normalizedName: m.author.toUpperCase() },
            });
          return c;
        });
      await prisma.mangaCreator.create({
        data: {
          mangaId: manga.id,
          creatorId: author.id,
          contributionType: ContributionType.AUTHOR,
        },
      });
    }

    if (m.artist) {
      let artist = await prisma.creator.findFirst({
        where: { name: m.artist },
      });
      if (!artist)
        artist = await prisma.creator.create({
          data: { name: m.artist, normalizedName: m.artist.toUpperCase() },
        });
      if (m.author !== m.artist) {
        await prisma.mangaCreator.create({
          data: {
            mangaId: manga.id,
            creatorId: artist.id,
            contributionType: ContributionType.ARTIST,
          },
        });
      }
    }

    // Link Genres
    // First clear existing links to ensure idempotency matches our list
    await prisma.mangaGenre.deleteMany({ where: { mangaId: manga.id } });

    for (const gSlug of m.genres) {
      const genre = await prisma.genre.findUnique({ where: { slug: gSlug } });
      if (genre) {
        await prisma.mangaGenre.create({
          data: {
            mangaId: manga.id,
            genreId: genre.id,
          },
        });
      }
    }

    // Upsert multiple chapters
    if (m.latestChapter) {
      const chapterCount = Math.min(6, m.latestChapter);

      for (let i = 0; i < chapterCount; i++) {
        const chapterNum = m.latestChapter - i;
        const chapter = await prisma.chapter.upsert({
          where: {
            mangaId_kind_number: {
              mangaId: manga.id,
              kind: ChapterKind.REGULAR,
              number: chapterNum,
            },
          },
          update: {
            title: chapterTitles[i % chapterTitles.length],
          },
          create: {
            mangaId: manga.id,
            kind: ChapterKind.REGULAR,
            number: chapterNum,
            sortOrder: chapterNum,
            displayLabel: `Capítulo ${chapterNum}`,
            title: chapterTitles[i % chapterTitles.length],
            status: ChapterStatus.ACTIVE,
          },
        });

        // Ensure at least one published release
        const existingRelease = await prisma.chapterRelease.findFirst({
          where: {
            chapterId: chapter.id,
            status: ChapterReleaseStatus.PUBLISHED,
          },
          orderBy: [
            { publishedAt: { sort: 'desc', nulls: 'last' } },
            { id: 'desc' },
          ],
        });

        const release =
          existingRelease ??
          (await prisma.chapterRelease.create({
            data: {
              chapterId: chapter.id,
              language: 'es-LA',
              status: ChapterReleaseStatus.PUBLISHED,
              publishedAt: new Date(
                Date.UTC(2026, 0, 1) - i * 2 * 24 * 60 * 60 * 1000,
              ),
            },
          }));

        const groupSlug = i % 2 === 0 ? 'luna-translation' : 'nebula-scan';
        await prisma.chapterReleaseGroup.upsert({
          where: {
            chapterReleaseId_groupId: {
              chapterReleaseId: release.id,
              groupId: groupRecords[groupSlug],
            },
          },
          update: {},
          create: {
            chapterReleaseId: release.id,
            groupId: groupRecords[groupSlug],
          },
        });

        // Positive variable counts keep every demo chapter readable. Broken
        // releases belong in isolated integration data, not the product seed.
        const pageCount = [3, 5, 9, 4, 7, 6][i] ?? 7;
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
          await prisma.chapterPage.upsert({
            where: {
              chapterReleaseId_pageNumber: {
                chapterReleaseId: release.id,
                pageNumber,
              },
            },
            update: { assetId: readerPageAsset.id },
            create: {
              chapterReleaseId: release.id,
              pageNumber,
              assetId: readerPageAsset.id,
            },
          });
        }

        await prisma.chapterPage.deleteMany({
          where: {
            chapterReleaseId: release.id,
            pageNumber: { gt: pageCount },
          },
        });
      }
    }
  }

  await ensureDevelopmentCommunities(developmentIdentityRecords);

  console.log('✅ Development catalog seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
