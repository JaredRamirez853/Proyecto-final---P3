import { pool } from "./pool";
import { env } from "../config/env";

type RawgStore = {
  store?: { slug?: string; name?: string };
  url?: string;
};

type RawgGame = {
  id: number;
  name: string;
  description?: string;
  description_raw?: string;
  released?: string | null;
  background_image?: string | null;
  rating?: number;
  genres?: Array<{ name: string }>;
  platforms?: Array<{ platform?: { id?: number; name?: string } }>;
  stores?: RawgStore[];
  metacritic?: number | null;
  esrb_rating?: { id?: number; slug?: string; name?: string } | null;
  tags?: Array<{ slug?: string; name?: string }>;
};

const TOTAL_GAMES = 300;
const MIN_RECENT = 20;
const MIN_UPCOMING = 20;
const RECENT_START = "2025-01-01";
const RECENT_END = "2026-12-31";
const GENERAL_START = "2012-01-01";
const UPCOMING_END = "2027-12-31";

function normalizeDescription(description?: string) {
  return description
    ?.replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function looksUsefulDescription(text: string) {
  return text.length >= 100;
}

function looksEnglish(text: string) {
  const normalized = text.toLowerCase();
  const englishWords = [
    "the", "and", "you", "your", "game", "with", "for", "this",
    "from", "can", "will", "have", "story", "world", "player"
  ];
  const matches = englishWords.filter((word) => new RegExp(`\\b${word}\\b`).test(normalized)).length;
  return matches >= 2;
}

function isSafeForGameHub(game: RawgGame) {
  const title = game.name.toLowerCase();
  const description = normalizeDescription(game.description_raw || game.description)?.toLowerCase() ?? "";
  const esrb = game.esrb_rating?.slug?.toLowerCase() ?? "";
  const tags = (game.tags ?? []).map((tag) => `${tag.slug ?? ""} ${tag.name ?? ""}`.toLowerCase()).join(" ");
  const haystack = `${title} ${tags} ${description}`;

  if (["adults-only", "ao"].includes(esrb)) return false;

  const blockedTerms = [
    "porn", "porno", "pornographic", "hentai", "nsfw", "xxx",
    "erotic", "ecchi", "sexual prison", "sexual content", "adult game",
    "sex simulator", "sex game", "nude", "nudity", "uncensored",
    "explicit sexual", "18+ erotic"
  ];

  return !blockedTerms.some((term) => haystack.includes(term));
}

function isPcGame(game: RawgGame) {
  return (game.platforms ?? []).some(
    (item) => item.platform?.id === 4 || item.platform?.name?.toLowerCase() === "pc"
  );
}

function getStoreSearchLinks(title: string) {
  const encoded = encodeURIComponent(title);
  return [
    { storeId: 1, url: `https://store.steampowered.com/search/?term=${encoded}` },
    { storeId: 2, url: `https://store.epicgames.com/en-US/browse?q=${encoded}` },
    { storeId: 3, url: `https://www.gog.com/en/games?query=${encoded}` }
  ];
}

function storeSlugToId(slug: string) {
  const value = slug.toLowerCase();
  if (value.includes("steam")) return 1;
  if (value.includes("epic-games")) return 2;
  if (value === "gog" || value.includes("gog-com") || value.includes("gog")) return 3;
  return null;
}

async function requestGames(params: Record<string, string>, page: number): Promise<RawgGame[]> {
  const query = new URLSearchParams({
    key: env.rawgApiKey,
    page: String(page),
    page_size: "40",
    ...params
  });

  const response = await fetch(`https://api.rawg.io/api/games?${query.toString()}`);

  if (response.ok) {
    const data = await response.json() as { results: RawgGame[] };
    return data.results ?? [];
  }

  if (response.status === 404) {
    // Some combinations of filters can return 404. Retry with a simple,
    // documented games query and let the importer filter the results locally.
    const fallback = new URLSearchParams({
      key: env.rawgApiKey,
      page: String(page),
      page_size: "40",
      ordering: params.ordering ?? "-rating"
    });

    const fallbackResponse = await fetch(`https://api.rawg.io/api/games?${fallback.toString()}`);

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json() as { results: RawgGame[] };
      return data.results ?? [];
    }
  }

  throw new Error(`RAWG respondió con ${response.status}.`);
}

async function fetchDetails(id: number): Promise<RawgGame> {
  const query = new URLSearchParams({ key: env.rawgApiKey });
  const response = await fetch(`https://api.rawg.io/api/games/${id}?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`RAWG no pudo obtener el juego ${id}: ${response.status}.`);
  }

  return response.json() as Promise<RawgGame>;
}

async function collectCandidates(
  queryParams: Record<string, string>,
  accept: (game: RawgGame) => boolean,
  minimum: number,
  maxPages: number
) {
  const results: RawgGame[] = [];
  const seen = new Set<number>();

  for (let page = 1; page <= maxPages && results.length < minimum; page += 1) {
    const games = await requestGames(queryParams, page);
    if (!games.length) break;

    for (const game of games) {
      if (seen.has(game.id)) continue;
      seen.add(game.id);

      if (!accept(game)) continue;

      results.push(game);
      if (results.length >= minimum) break;
    }
  }

  return results;
}

async function seedRawg() {
  if (!env.rawgApiKey) {
    throw new Error("Configura RAWG_API_KEY en .env antes de ejecutar este script.");
  }

  await pool.query(
    "INSERT IGNORE INTO categories (name) VALUES ('RPG'), ('Acción'), ('Aventura'), ('Terror'), ('Estrategia'), ('Indie')"
  );
  await pool.query(
    "INSERT IGNORE INTO stores (name) VALUES ('Steam'), ('Epic Games'), ('GOG')"
  );

  // Limpia el catálogo actual, pero deja intactas las cuentas de usuario.
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("TRUNCATE TABLE game_stores");
  await pool.query("TRUNCATE TABLE games");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  const today = new Date().toISOString().slice(0, 10);

  const recentCandidates = await collectCandidates(
    { dates: `${RECENT_START},${RECENT_END}`, ordering: "-released" },
    (game) =>
      Boolean(
        game.released &&
        game.released >= RECENT_START &&
        game.released <= RECENT_END &&
        isPcGame(game) &&
        isSafeForGameHub(game)
      ),
    50,
    20
  );

  const upcomingCandidates = await collectCandidates(
    { dates: `${today},${UPCOMING_END}`, ordering: "released" },
    (game) =>
      Boolean(
        game.released &&
        game.released > today &&
        game.released <= UPCOMING_END &&
        isPcGame(game) &&
        isSafeForGameHub(game)
      ),
    50,
    20
  );

  const popularCandidates = await collectCandidates(
    { ordering: "-rating" },
    (game) =>
      Boolean(
        game.released &&
        game.released >= GENERAL_START &&
        game.released <= today &&
        isPcGame(game) &&
        isSafeForGameHub(game)
      ),
    TOTAL_GAMES,
    30
  );

  const selected = new Map<number, RawgGame>();

  // Prioriza las secciones que necesitamos para el Release.
  [...recentCandidates, ...upcomingCandidates, ...popularCandidates].forEach((game) => {
    if (!selected.has(game.id)) selected.set(game.id, game);
  });

  const games = Array.from(selected.values()).slice(0, TOTAL_GAMES);
  const recentIds = new Set(recentCandidates.map((game) => game.id));
  const upcomingIds = new Set(upcomingCandidates.map((game) => game.id));

  console.log(`Candidatos seleccionados: ${games.length}`);
  console.log(`Candidatos de novedades: ${recentCandidates.length}`);
  console.log(`Candidatos próximos: ${upcomingCandidates.length}`);

  let inserted = 0;
  let skipped = 0;

  for (let index = 0; index < games.length; index += 1) {
    const summary = games[index];

    try {
      const game = await fetchDetails(summary.id);
      const description = normalizeDescription(game.description_raw || game.description);

      if (
        !game.background_image ||
        !description ||
        !looksUsefulDescription(description) ||
        !looksEnglish(description) ||
        !isPcGame(game) ||
        !isSafeForGameHub(game) ||
        !game.released
      ) {
        skipped += 1;
        continue;
      }

      const released = game.released;
      const genreNames = game.genres?.slice(0, 4).map((genre) => genre.name) ?? [];
      const genres = genreNames.join(", ") || "Indie";
      const platforms = game.platforms
        ?.map((item) => item.platform?.name)
        .filter(Boolean)
        .slice(0, 6)
        .join(", ") || "PC";

      const genreText = genres.toLowerCase();
      let categoryName = "Indie";
      if (genreText.includes("rpg")) categoryName = "RPG";
      else if (genreText.includes("action")) categoryName = "Acción";
      else if (genreText.includes("adventure")) categoryName = "Aventura";
      else if (genreText.includes("horror")) categoryName = "Terror";
      else if (genreText.includes("strategy")) categoryName = "Estrategia";

      const [categoryRows] = await pool.query(
        "SELECT id FROM categories WHERE name = ? LIMIT 1",
        [categoryName]
      );
      const categoryId = (categoryRows as any[])[0]?.id ?? null;

      const isUpcoming = released > today;
      const isOnSale = !isUpcoming && (index % 10 === 0 || summary.id % 13 === 0);
      const discount = isOnSale ? 20 + ((index * 7) % 41) : 0;
      const originalPrice = isOnSale ? 59.99 : null;
      const salePrice = isOnSale
        ? Number((originalPrice! * (1 - discount / 100)).toFixed(2))
        : null;

      const [result] = await pool.query(
        `INSERT INTO games
        (rawg_id, title, description, release_date, image_url, genre, platform, rating, is_on_sale, discount_percent, original_price, sale_price, category_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          release_date = VALUES(release_date),
          image_url = VALUES(image_url),
          genre = VALUES(genre),
          platform = VALUES(platform),
          rating = VALUES(rating),
          is_on_sale = VALUES(is_on_sale),
          discount_percent = VALUES(discount_percent),
          original_price = VALUES(original_price),
          sale_price = VALUES(sale_price),
          category_id = VALUES(category_id)`,
        [
          game.id,
          game.name,
          description,
          released,
          game.background_image,
          genres,
          platforms,
          Number(game.rating ?? 0),
          isOnSale,
          discount,
          originalPrice,
          salePrice,
          categoryId
        ]
      );

      const insertedId = Number((result as any).insertId);
      let gameId = insertedId;

      if (!gameId) {
        const [rows] = await pool.query(
          "SELECT id FROM games WHERE rawg_id = ? LIMIT 1",
          [game.id]
        );
        gameId = Number((rows as any[])[0]?.id);
      }

      await pool.query("DELETE FROM game_stores WHERE game_id = ?", [gameId]);

      const directLinks = (game.stores ?? [])
        .map((store) => ({
          storeId: storeSlugToId(store.store?.slug ?? ""),
          url: store.url
        }))
        .filter(
          (item): item is { storeId: number; url: string } =>
            Boolean(item.storeId && item.url)
        );

      const links = directLinks.length > 0
        ? directLinks
        : getStoreSearchLinks(game.name);

      for (const link of links) {
        await pool.query(
          "INSERT IGNORE INTO game_stores (game_id, store_id, url) VALUES (?, ?, ?)",
          [gameId, link.storeId, link.url]
        );
      }

      const tag = upcomingIds.has(game.id)
        ? "PRÓXIMO"
        : recentIds.has(game.id)
          ? "NOVEDAD"
          : "";

      console.log(
        `${index + 1}/${games.length}: ${game.name}${tag ? ` [${tag}]` : ""}`
      );
      inserted += 1;
    } catch (error) {
      skipped += 1;
      console.log(
        `${index + 1}/${games.length}: ${summary.name} omitido (${error instanceof Error ? error.message : "error"})`
      );
    }
  }

  const [[recentCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM games WHERE release_date BETWEEN '2025-01-01' AND '2026-12-31'"
  );
  const [[upcomingCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM games WHERE release_date > CURDATE()"
  );
  const [[totalCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM games"
  );

  console.log(`Importación finalizada. Insertados: ${inserted}. Omitidos: ${skipped}.`);
  console.log(`Total en biblioteca: ${totalCount.total}`);
  console.log(`Novedades 2025-2026: ${recentCount.total}`);
  console.log(`Próximamente: ${upcomingCount.total}`);

  await pool.end();
}

seedRawg().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
