for (const name of ["log", "info", "debug"]) console[name] = console.error;
const module = await import(Deno.args[0]);
await new Response(JSON.stringify({ skill: module.skill ?? null, runs: typeof module.default === "function" })).body
  .pipeTo(Deno.stdout.writable);
