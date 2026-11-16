import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import search, { skill } from "../web_search/index.js";

async function withEnv(url, run) {
  const before = process.env.WEB_URL;
  if (url === undefined) delete process.env.WEB_URL;
  else process.env.WEB_URL = url;
  try {
    return await run();
  } finally {
    if (before === undefined) delete process.env.WEB_URL;
    else process.env.WEB_URL = before;
  }
}

async function withStub(handler, run) {
  const requests = [];
  const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (request) => {
    requests.push(new URL(request.url));
    return handler(request);
  });
  try {
    return await withEnv(`http://127.0.0.1:${server.addr.port}/`, () => run(requests));
  } finally {
    await server.shutdown();
  }
}

Deno.test("the skill is named web_search and requires a query", () => {
  assertEquals(skill.name, "web_search");
  assertEquals(skill.input.required, ["query"]);
  assertEquals(skill.env, ["WEB_URL"]);
});

Deno.test("it throws when WEB_URL is not set", async () => {
  await withEnv(undefined, async () => {
    await assertRejects(() => search({ query: "lesotho" }), Error, "WEB_URL is not set");
  });
});

Deno.test("it throws when the query is empty", async () => {
  await withEnv("http://127.0.0.1:1", async () => {
    await assertRejects(() => search({ query: "   " }), Error, "give a query");
    await assertRejects(() => search({}), Error, "give a query");
  });
});

Deno.test("results come back trimmed to title, url and snippet, limited", async () => {
  const results = Array.from({ length: 8 }, (_, i) => ({
    title: ` Title ${i} `,
    url: `https://example.com/${i}`,
    snippet: "s".repeat(500),
    score: 0.9,
    raw: "dropped",
  }));
  await withStub(() => Response.json({ results }), async (requests) => {
    const out = await search({ query: "lesotho", limit: 3 });
    assertEquals(out.results.length, 3);
    assertEquals(Object.keys(out.results[0]), ["title", "url", "snippet"]);
    assertEquals(out.results[0].title, "Title 0");
    assertEquals(out.results[0].snippet.length, 300);
    assertEquals(requests[0].pathname, "/search");
    assertEquals(requests[0].searchParams.get("q"), "lesotho");
    assertEquals(requests[0].searchParams.get("limit"), "3");
    assertEquals((await search({ query: "lesotho" })).results.length, 6);
  });
});

Deno.test("a 500 throws an error that does not include the body", async () => {
  await withStub(() => new Response("secret upstream detail", { status: 500 }), async () => {
    const error = await assertRejects(() => search({ query: "lesotho" }), Error, "500");
    assert(!error.message.includes("secret upstream detail"));
  });
});

// The timeout path is not tested: the 25 second limit is a constant in the skill
// and cannot be shortened without changing the module.
