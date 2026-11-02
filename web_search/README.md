# web_search

Searches the web with [Tavily](https://tavily.com) (basic search, 6 results) and answers with the passages that best
match the query, and the pages they are from. Each result's content is cut into passages of about 600 characters
along paragraph and sentence breaks, and the passages are ranked against the query with BM25 (k1 1.2, b 0.75, words
lower-cased and lightly stemmed); the best 6 that share a word with the query come back. Ported from zazi's web
search; it does not crawl or read links.

**Input:** `{ "query": "capital of Lesotho" }`

**Result:**

```json
{
  "passages": [{ "text": "Maseru is the capital ...", "url": "https://...", "title": "..." }],
  "sources": [{ "url": "https://...", "title": "..." }]
}
```

**Environment:**

| name | |
| --- | --- |
| `TAVILY_API_KEY` | Sent as `Authorization: Bearer`. A Tavily key, or a relay's own key. |
| `TAVILY_URL` | Where Tavily is: `https://api.tavily.com` when unset. A relay that answers Tavily's `POST /search` works too. |

**Net:** `api.tavily.com`, and a relay on the same machine at `127.0.0.1:48402`.

In dm's `tools.json`:

```json
{
  "web_search": {
    "js": "https://openwork.africa/skill/web_search/index.js",
    "sha256": "<from https://openwork.africa/skill/index.json>",
    "env": { "TAVILY_API_KEY": "$TAVILY_API_KEY" }
  }
}
```
