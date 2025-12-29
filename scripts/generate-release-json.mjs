import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArg(name, required = false) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  if (required) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return undefined;
}

function maybeAddPlatform(platforms, keyPrefix, platformKey) {
  const url = getArg(`--${keyPrefix}-url`);
  const sig = getArg(`--${keyPrefix}-sig`);
  if (url && sig) {
    platforms[platformKey] = {
      url,
      signature: sig,
    };
  }
}

function main() {
  const version = getArg("--version", true);
  const notes = getArg("--notes") ?? "";
  const pubDate = new Date().toISOString();

  const platforms = {};

  // windows-x86_64
  maybeAddPlatform(platforms, "win", "windows-x86_64");
  // macOS (Intel)
  maybeAddPlatform(platforms, "mac", "darwin-x86_64");
  // macOS (Apple Silicon)
  maybeAddPlatform(platforms, "mac-arm64", "darwin-aarch64");
  // linux-x86_64
  maybeAddPlatform(platforms, "linux", "linux-x86_64");

  if (Object.keys(platforms).length === 0) {
    throw new Error("No platforms specified. Provide at least one --*-url and --*-sig pair.");
  }

  const release = {
    version,
    notes,
    pub_date: pubDate,
    platforms,
  };

  const outPath = path.join(__dirname, "..", "releases.json");
  fs.writeFileSync(outPath, JSON.stringify(release, null, 2), "utf8");
  console.log(`releases.json generated at: ${outPath}`);
}

main();

