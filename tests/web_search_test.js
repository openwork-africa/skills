import { assert, assertEquals } from "jsr:@std/assert@1";
import search, { cut, focus, rank, skill, words } from "../web_search/index.js";

Deno.test("text is cut into passages of about 600 characters along sentence breaks", () => {
  const sentence = "The quick brown fox jumps over the lazy dog again. ";
  const parts = cut(sentence.repeat(40));
  assert(parts.length > 1);
  assert(parts.every((part) => part.length <= 600 && part.endsWith(".")));
  assertEquals(parts.join(" ").replace(/\s+/g, " "), sentence.repeat(40).trim().replace(/\s+/g, " "));
});

Deno.test("passages are ranked by BM25 and only matching ones come back", () => {
  const passages = [
    { text: "Bananas grow in warm places.", url: "a", title: "A" },
    { text: "Maseru is the capital of Lesotho, a kingdom in southern Africa.", url: "b", title: "B" },
    { text: "Lesotho is surrounded by South Africa.", url: "c", title: "C" },
  ];
  assertEquals(rank("capital of Lesotho", passages).map((p) => p.url), ["b", "c"]);
  assertEquals(words("Searching cities"), ["search", "city"]);
});

Deno.test("the best six passages come back with their sources once each", () => {
  const text = Array.from({ length: 20 }, (_, i) => `Lesotho fact number ${i} is here and it is long enough to be a passage of its own. `.repeat(6)).join("\n\n");
  const { passages, sources } = focus("Lesotho fact", [{ title: "Facts", url: "https://example.com/facts", text }, { title: "None", url: "https://x", text: "Nothing." }]);
  assertEquals(passages.length, 6);
  assertEquals(sources, [{ url: "https://example.com/facts", title: "Facts" }]);
});

Deno.test("it declares the hosts and variables it may use", () => {
  assertEquals(skill.net, ["api.tavily.com", "127.0.0.1:48402"]);
  assertEquals(skill.env, ["TAVILY_URL", "TAVILY_API_KEY"]);
});
