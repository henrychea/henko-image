// Tags the version Tauri actually builds, after checking the other two manifests agree.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const version = JSON.parse(read("src-tauri/tauri.conf.json")).version;

const others = [
  ["package.json", JSON.parse(read("package.json")).version],
  ["src-tauri/Cargo.toml", /^version = "([^"]+)"/m.exec(read("src-tauri/Cargo.toml"))[1]],
];
const drift = others.filter(([, v]) => v !== version);

if (drift.length) {
  console.error(`src-tauri/tauri.conf.json says ${version}, but:`);
  for (const [file, v] of drift) console.error(`  ${file} says ${v}`);
  process.exit(1);
}

const tag = `v${version}`;
try {
  execFileSync("git", ["rev-parse", "--verify", "--quiet", "HEAD"], { stdio: "ignore" });
} catch {
  console.error("No commits yet. Commit first, then tag.");
  process.exit(1);
}

try {
  execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], { stdio: "ignore" });
  console.error(`Tag ${tag} already exists. Bump the version first.`);
  process.exit(1);
} catch {
  // not tagged yet
}

execFileSync("git", ["tag", "--annotate", tag, "--message", `Henko ${tag}`], { stdio: "inherit" });
console.log(`Created ${tag}. Publish it with:\n  git push origin ${tag}`);
