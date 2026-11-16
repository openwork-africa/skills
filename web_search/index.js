export const skill = {
  name: "web_search",
  description:
    "Search the web for current facts, news, places, people and anything else not in what you know. " +
    "Give a short query, as you would type it into a search engine. " +
    "It returns results, each with a title, a link and a snippet.",
  input: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to search for, in a few words." },
      limit: { type: "integer", minimum: 1, maximum: 10, description: "How many results to return (default 6)." },
    },
    required: ["query"],
  },
  net: ["127.0.0.1:48402"],
  env: ["WEB_URL"],
};

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;
const SNIPPET = 300;
const TIMEOUT_MS = 25_000;

export default async function ({ query, limit } = {}) {
  query = String(query ?? "").trim();
  if (!query) throw new Error("give a query");
  const wanted = Number.isFinite(Number(limit)) && limit !== null && limit !== "" ? Math.trunc(Number(limit)) : DEFAULT_LIMIT;
  const count = Math.min(MAX_LIMIT, Math.max(1, wanted));
  if (!process.env.WEB_URL) throw new Error("WEB_URL is not set");
  const base = process.env.WEB_URL.replace(/\/+$/, "");
  let response;
  try {
    response = await fetch(`${base}/search?${new URLSearchParams({ q: query, limit: String(count) })}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e?.name === "TimeoutError") throw new Error(`the search timed out after ${TIMEOUT_MS / 1000} seconds`);
    throw e;
  }
  if (response.status !== 200) throw new Error(`the search failed: ${response.status}`);
  const { results = [] } = await response.json();
  return {
    results: results.slice(0, count).map(({ title, url, snippet }) => ({
      title: String(title ?? "").trim(),
      url: String(url ?? "").trim(),
      snippet: String(snippet ?? "").trim().slice(0, SNIPPET),
    })),
  };
}
