#!/usr/bin/env node
/**
 * Tauri updater 升级清单（latest.json）工具，分两步使用：
 *
 * 1) collect —— 在各个平台的构建机（能确定目标架构）上执行：
 *      node scripts/latest-json.mjs collect \
 *        --bundle src-tauri/target/release/bundle \
 *        --platform windows-x86_64 \
 *        --out updater-windows.json
 *    产物：{ "platforms": { "<platform>": { "file": "...", "signature": "..." } } }
 *
 *    不传 --platform 时会尝试从文件名推断（Windows/Linux 可以推断；
 *    macOS 的 *.app.tar.gz 不含架构，必须显式传 --platform）。
 *
 * 2) assemble —— 在发布机上合并各平台片段，生成最终的 latest.json：
 *      node scripts/latest-json.mjs assemble \
 *        --manifests manifests \
 *        --version 1.0.13 \
 *        --base-url https://oss.ufactory.cc/releases/studio_client/v1.0.13 \
 *        --out oss-stage/latest.json
 *
 * notes 从环境变量 LATEST_NOTES 读取（客户端会 JSON.parse，必须是合法 JSON 字符串）。
 *
 * 每个平台选用的安装包：
 *   windows-x86_64 : *-setup.exe（NSIS，passive/basicUi 升级模式使用）
 *   linux-x86_64   : *.AppImage.tar.gz
 *   darwin-*       : *.app.tar.gz
 * 只收集带 .sig 签名的产物；缺失签名时直接报错，避免发布无法升级的清单。
 */
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    options[key.slice(2)] = value;
    i += 1;
  }
  return options;
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile()) onFile(full);
  }
}

function inferPlatform(name) {
  const lower = name.toLowerCase();
  const arch = /(aarch64|arm64)/i.test(lower) ? "aarch64" : "x86_64";
  if (lower.endsWith("-setup.exe")) return "windows-x86_64";
  if (lower.endsWith(".appimage.tar.gz")) return `linux-${arch}`;
  if (lower.endsWith(".app.tar.gz")) {
    return null; // 文件名不带架构，需要显式指定
  }
  return null;
}

function isUpdaterArtifact(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith("-setup.exe") ||
    lower.endsWith(".appimage.tar.gz") ||
    lower.endsWith(".app.tar.gz")
  );
}

function collect({ bundle, platform, out }) {
  if (!fs.existsSync(bundle)) throw new Error(`Bundle directory not found: ${bundle}`);

  const candidates = [];
  walk(bundle, (full) => {
    const name = path.basename(full);
    if (!isUpdaterArtifact(name)) return;
    candidates.push({ full, name });
  });

  if (candidates.length === 0) {
    throw new Error(
      `No updater artifacts (NSIS *.exe / *.AppImage.tar.gz / *.app.tar.gz) found in ${bundle}. ` +
        "Check bundle.createUpdaterArtifacts and TAURI_SIGNING_PRIVATE_KEY.",
    );
  }

  const resolvedPlatform = platform ?? inferPlatform(candidates[0].name);
  if (!resolvedPlatform) {
    throw new Error(
      "Cannot infer platform from artifact name; pass --platform (e.g. darwin-aarch64).",
    );
  }

  const matches = candidates.filter(
    (item) => (platform ? true : inferPlatform(item.name) === resolvedPlatform),
  );
  if (matches.length > 1) {
    throw new Error(
      `Multiple updater artifacts for ${resolvedPlatform}: ` +
        `${matches.map((item) => item.name).join(", ")}. Build one target per platform.`,
    );
  }

  const artifact = matches[0];
  const sigPath = `${artifact.full}.sig`;
  if (!fs.existsSync(sigPath)) {
    throw new Error(`Missing signature file: ${sigPath}`);
  }
  const signature = fs.readFileSync(sigPath, "utf8").trim();
  if (!signature) throw new Error(`Signature file is empty: ${sigPath}`);

  const payload = {
    platforms: {
      [resolvedPlatform]: { file: artifact.name, signature },
    },
  };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`${out}: ${resolvedPlatform} -> ${artifact.name}`);
}

function assemble({ manifests, version, baseUrl, out }) {
  if (!manifests || !fs.existsSync(manifests)) {
    throw new Error(`Manifest directory not found: ${manifests}`);
  }
  if (!version) throw new Error("--version is required");
  if (!baseUrl) throw new Error("--base-url is required");

  const notes = process.env.LATEST_NOTES ?? "";
  if (!notes) throw new Error("环境变量 LATEST_NOTES 为空，客户端无法显示更新说明");

  const platforms = {};
  for (const entry of fs.readdirSync(manifests, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(manifests, entry.name);
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const [platform, item] of Object.entries(parsed.platforms ?? {})) {
      if (platforms[platform]) {
        throw new Error(`Duplicate platform ${platform} (${file} and previous manifest)`);
      }
      if (!item.file || !item.signature) {
        throw new Error(`Invalid manifest entry for ${platform} in ${file}`);
      }
      platforms[platform] = {
        signature: item.signature,
        url: `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(item.file)}`,
      };
    }
  }

  if (Object.keys(platforms).length === 0) {
    throw new Error(`No platform entries found in ${manifests}`);
  }

  const sorted = {};
  for (const platform of Object.keys(platforms).sort()) {
    sorted[platform] = platforms[platform];
  }

  const manifest = {
    version: version.replace(/^v/i, ""),
    notes,
    pub_date: new Date().toISOString(),
    platforms: sorted,
  };

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Wrote ${out}`);
  for (const [platform, item] of Object.entries(sorted)) {
    console.log(`  ${platform}: ${item.url}`);
  }
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "collect":
      collect({
        bundle: args.bundle ?? "src-tauri/target/release/bundle",
        platform: args.platform,
        out: args.out ?? "updater-manifest.json",
      });
      break;
    case "assemble":
      assemble({
        manifests: args.manifests ?? "manifests",
        version: args.version,
        baseUrl: args["base-url"],
        out: args.out ?? "latest.json",
      });
      break;
    default:
      throw new Error(
        "Usage: latest-json.mjs <collect|assemble> [options]\n" +
          "  collect  --bundle <dir> [--platform <key>] --out <file>\n" +
          "  assemble --manifests <dir> --version <ver> --base-url <url> --out <file>",
      );
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
