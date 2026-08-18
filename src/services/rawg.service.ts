import { env } from "../config/env";

export async function searchRawgGames(search: string) {
  if (!env.rawgApiKey) {
    throw new Error("RAWG_API_KEY no está configurada.");
  }

  const params = new URLSearchParams({
    key: env.rawgApiKey,
    search,
    page_size: "10"
  });

  const response = await fetch(`https://api.rawg.io/api/games?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`RAWG respondió con ${response.status}.`);
  }

  return response.json();
}

export async function getRawgGame(id: number) {
  if (!env.rawgApiKey) {
    throw new Error("RAWG_API_KEY no está configurada.");
  }

  const params = new URLSearchParams({ key: env.rawgApiKey });
  const response = await fetch(`https://api.rawg.io/api/games/${id}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`RAWG respondió con ${response.status}.`);
  }

  return response.json();
}
