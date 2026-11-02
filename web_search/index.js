export const skill = {
  name: "web_search",
  description:
    "Search the web for current facts, news, places, people and anything else not in what you know. " +
    "Give a short query, as you would type it into a search engine. " +
    "It returns the passages that best match, each with the page it is from, and the sources.",
  input: {
    type: "object",
    properties: { query: { type: "string", description: "What to search for, in a few words." } },
    required: ["query"],
  },
  net: ["api.tavily.com", "127.0.0.1:48402"],
  env: ["TAVILY_URL", "TAVILY_API_KEY"],
};

const RESULTS = 6;
const PASSAGES = 6;
const PASSAGE = 600;
const K1 = 1.2;
const B = 0.75;

export default async function ({ query }) {
  query = String(query ?? "").trim();
  if (!query) throw new Error("give a query");
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not set");
  const base = (process.env.TAVILY_URL || "https://api.tavily.com").replace(/\/+$/, "");
  const response = await fetch(`${base}/search`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: RESULTS }),
  });
  if (!response.ok) throw new Error(`the search failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  const { results = [] } = await response.json();
  return focus(query, results.map(({ title, url, content }) => ({ title: String(title ?? ""), url: String(url ?? ""), text: String(content ?? "") })));
}

export function focus(query, pages) {
  const passages = pages.flatMap((page) => cut(page.text).map((text) => ({ text, url: page.url, title: page.title })));
  const best = rank(query, passages).slice(0, PASSAGES);
  const sources = [];
  for (const { url, title } of best) if (!sources.some((source) => source.url === url)) sources.push({ url, title });
  return { passages: best, sources };
}

export function cut(text) {
  const pieces = text.split(/(?<=\n{2,}|[.!?]\s+)/);
  const parts = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length > PASSAGE) {
      parts.push(current.trim());
      current = "";
    }
    current += piece;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function words(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map(stem);
}

const stem = (word) => {
  if (word.length <= 3) return word;
  for (const [ending, keep] of [["ies", "y"], ["ing", ""], ["edly", ""], ["ed", ""], ["ly", ""], ["es", ""], ["s", ""]]) {
    if (word.endsWith(ending) && word.length - ending.length >= 3) return word.slice(0, -ending.length) + keep;
  }
  return word;
};

export function rank(query, passages) {
  const asked = [...new Set(words(query))];
  const docs = passages.map((passage) => words(passage.text));
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / (docs.length || 1);
  const holding = new Map(asked.map((word) => [word, docs.filter((doc) => doc.includes(word)).length]));
  const scored = passages.map((passage, at) => {
    const doc = docs[at];
    let score = 0;
    for (const word of asked) {
      const count = doc.filter((w) => w === word).length;
      if (!count) continue;
      const n = holding.get(word);
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += (idf * count * (K1 + 1)) / (count + K1 * (1 - B + (B * doc.length) / (average || 1)));
    }
    return { passage, score };
  });
  return scored.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ passage }) => passage);
}
