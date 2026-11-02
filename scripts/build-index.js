import { fromFileUrl, join } from "jsr:@std/path@1";

const HOST = "https://openwork.africa/skill";
const root = fromFileUrl(new URL("..", import.meta.url));
const NAME = /^[A-Za-z0-9_-]{1,64}$/;

const hex = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");

export function problems(name, skill, runs) {
  const wrong = [];
  const list = (value) => value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string" && item && !/[, =]/.test(item)));
  if (!skill || typeof skill !== "object") return ["it exports no `skill` object"];
  if (skill.name !== name) wrong.push(`its name is ${JSON.stringify(skill.name)}, not its folder's, ${name}`);
  if (typeof skill.description !== "string" || !skill.description.trim()) wrong.push("it has no description");
  if (skill.input?.type !== "object") wrong.push("its input is not a JSON schema of type object");
  if (skill.input?.properties !== undefined && (typeof skill.input.properties !== "object" || Array.isArray(skill.input.properties))) wrong.push("its input's properties are not an object");
  if (!list(skill.net)) wrong.push("its net is not a list of hosts");
  if (!list(skill.env)) wrong.push("its env is not a list of names");
  if (!runs) wrong.push("its default export is not a function");
  return wrong;
}

const describe = async (path) => {
  const done = await new Deno.Command(Deno.execPath(), {
    args: ["run", "--quiet", "--no-prompt", "--no-config", "--no-lock", `--allow-read=${path}`, join(root, "scripts/describe.js"), `file://${path}`],
    clearEnv: true,
    env: { NO_COLOR: "1" },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!done.success) throw new Error(new TextDecoder().decode(done.stderr).trim().split("\n").at(-1));
  return JSON.parse(new TextDecoder().decode(done.stdout));
};

const index = {};
let failed = false;
for (const entry of [...Deno.readDirSync(root)].sort((a, b) => a.name.localeCompare(b.name))) {
  const path = join(root, entry.name, "index.js");
  if (!entry.isDirectory || entry.name.startsWith(".") || !(await Deno.stat(path).then(() => true, () => false))) continue;
  const name = entry.name;
  try {
    if (!NAME.test(name)) throw new Error("a skill's folder is 1 to 64 letters, digits, _ or -");
    const { skill, runs } = await describe(path);
    const wrong = problems(name, skill, runs);
    if (wrong.length) throw new Error(wrong.join("; "));
    index[name] = { js: `${HOST}/${name}/index.js`, sha256: await hex(await Deno.readFile(path)), description: skill.description };
    console.error(`ok   ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
if (failed) Deno.exit(1);
const text = JSON.stringify(index, null, 2) + "\n";
if (Deno.args.includes("--check")) {
  const there = await Deno.readTextFile(join(root, "index.json")).catch(() => "");
  if (there !== text) {
    console.error("index.json is not what the skills make it: run scripts/build-index.js and commit it");
    Deno.exit(1);
  }
} else {
  await Deno.writeTextFile(join(root, "index.json"), text);
}
