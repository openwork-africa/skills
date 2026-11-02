# skills

Skills for [dm](https://github.com/openwork-africa/dm), one folder each, served at `https://openwork.africa/skill/`:

| skill | |
| --- | --- |
| [`web_search`](web_search/) | Searches the web with Tavily and answers with the passages that best match, and their sources. |

`https://openwork.africa/skill/index.json` lists them by name. Each entry can be copied into dm's `tools.json` as it is
(dm ignores `description`), then given its `env`:

```json
{
  "web_search": {
    "js": "https://openwork.africa/skill/web_search/index.js",
    "sha256": "<as index.json gives it>",
    "description": "Search the web ..."
  }
}
```

`sha256` pins the module: dm runs only a module with that hash, so a changed file here runs nowhere until a
`tools.json` moves to its new hash.

## The two kinds of skill

**A JavaScript skill** is one Node.js-style ES module, `<name>/index.js`, that describes itself. `node:` imports and
`npm:` packages work. dm runs it under Deno, which holds it to the hosts in `net` and the variables in `env`:

```js
export const skill = {
  name: "web_search",
  description: "What it is for, for the model.",
  input: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  net: ["api.tavily.com"],
  env: ["TAVILY_URL", "TAVILY_API_KEY"],
};

export default async function (input) {
  return {};
}
```

dm reads `skill` with no permissions and no environment, then calls the default export with only what `skill`
declares, the values of `env` coming from the `tools.json` entry. It may take 30 seconds and answer with 1 MiB. What
it prints goes to stderr; what it returns is the result; what it throws is an error the model reads.

**An HTTP skill** is an endpoint that describes itself: `GET <endpoint>` answers `{ "name", "description", "input" }`,
and `POST <endpoint>` with the input JSON answers with the result JSON. It is listed in `tools.json` as
`{ "http": "<endpoint>", "headers"?: { ... } }`; nothing of it lives here.

## Adding a skill

1. Make `<name>/index.js` and `<name>/README.md` (what it does, its input, its result, its `env`).
2. `deno run --allow-read=. --allow-write=index.json --allow-run=deno scripts/build-index.js` loads each module under
   Deno with no permissions, checks its `skill`, and writes `index.json`.
3. Tests go in `tests/`: `deno test --allow-env tests/`.

CI does both on every push and pull request, and fails when `index.json` is not what the modules make it. A push to
`main` publishes once CI passes.

## License

MIT
