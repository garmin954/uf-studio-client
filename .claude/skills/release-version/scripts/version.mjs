#!/usr/bin/env node
/**
 * 版本号读取 / 更新
 *
 *   node version.mjs current
 *   node version.mjs bump patch
 *   node version.mjs bump minor
 *   node version.mjs bump major
 *   node version.mjs bump 1.2.3
 *
 * 只改版本号，不做任何 git 操作（提交 / tag / 推送见 git-release.mjs）。
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const TARGETS = [
  { file: "package.json", kind: "json" },
  { file: "src-tauri/tauri.conf.json", kind: "json" },
  { file: "src-tauri/Cargo.toml", kind: "cargo" },
];
const CARGO_LOCK = "src-tauri/Cargo.lock";
const CARGO_PACKAGE = "UFACTORY-Studio";
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, text) {
  fs.writeFileSync(path.join(ROOT, rel), text, "utf8");
}

function parseVersion(value, where) {
  const match = SEMVER.exec(value);
  if (!match) fail(`${where} 中的版本号 "${value}" 不是合法 semver`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersion(a, b) {
  const x = parseVersion(a, "compare");
  const y = parseVersion(b, "compare");
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch;
}

function extractVersion(target) {
  const text = read(target.file);
  if (target.kind === "json") {
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (error) {
      fail(`${target.file} 不是合法 JSON: ${error.message}`);
    }
    // 必须是顶层 version，避免误取依赖里的 version
    if (typeof obj.version !== "string") fail(`${target.file} 缺少顶层 version 字段`);
    return obj.version;
  }
  const match = /\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m.exec(text);
  if (!match) fail(`无法在 ${target.file} 的 [package] 段中找到 version`);
  return match[1];
}

function replaceVersion(target, to) {
  const text = read(target.file);
  let next;
  if (target.kind === "json") {
    // 只在文件里恰好有一个顶层 "version" 键时才替换，避免误改嵌套字段
    const occurrences = text.match(/^[ \t]*"version"\s*:/gm) ?? [];
    if (occurrences.length !== 1) {
      fail(`${target.file} 中有 ${occurrences.length} 处 "version" 键，无法安全替换，请手动修改`);
    }
    const indent = (text.match(/^([ \t]*)"version"\s*:/m) || [])[1] ?? "  ";
    next = text.replace(/^[ \t]*"version"\s*:\s*"[^"]*"/m, `${indent}"version": "${to}"`);
  } else {
    next = text.replace(
      /(\[package\][\s\S]*?^version\s*=\s*")[^"]*(")/m,
      (_, head, tail) => `${head}${to}${tail}`,
    );
  }
  if (next === text) fail(`写入 ${target.file} 失败：未找到可替换的版本号`);
  write(target.file, next);
}

function updateCargoLock(to) {
  const file = path.join(ROOT, CARGO_LOCK);
  if (!fs.existsSync(file)) return "missing";
  const text = fs.readFileSync(file, "utf8");
  const pattern = new RegExp(`(name = "${CARGO_PACKAGE}"\\r?\\nversion = ")[^"]*(")`);
  if (!pattern.test(text)) return "not-found";
  // Cargo.lock 已在 .gitignore 中，这里只是让本地构建元数据保持一致
  fs.writeFileSync(file, text.replace(pattern, (_, head, tail) => `${head}${to}${tail}`), "utf8");
  return "updated";
}

function tagExists(tag) {
  const result = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return result.status === 0;
}

function currentCommand() {
  const files = TARGETS.map((target) => ({ file: target.file, version: extractVersion(target) }));
  const version = files[0].version;
  const inconsistent = files.filter((item) => item.version !== version);
  const payload = { version, consistent: inconsistent.length === 0, files };
  console.log(JSON.stringify(payload, null, 2));
  if (inconsistent.length > 0) {
    console.error(
      `warning: 版本号不一致，请先手动对齐：${inconsistent
        .map((item) => `${item.file}=${item.version}`)
        .join(", ")}`,
    );
  }
}

function bumpCommand(mode) {
  if (!mode) fail("用法: node version.mjs bump <major|minor|patch|x.y.z>");

  const files = TARGETS.map((target) => ({ file: target.file, version: extractVersion(target) }));
  const from = files[0].version;
  const inconsistent = files.filter((item) => item.version !== from);
  if (inconsistent.length > 0) {
    fail(
      `版本号不一致，请先手动对齐：${inconsistent
        .map((item) => `${item.file}=${item.version}`)
        .join(", ")}`,
    );
  }

  let to;
  if (["major", "minor", "patch"].includes(mode)) {
    const { major, minor, patch } = parseVersion(from, "package.json");
    if (mode === "major") to = `${major + 1}.0.0`;
    if (mode === "minor") to = `${major}.${minor + 1}.0`;
    if (mode === "patch") to = `${major}.${minor}.${patch + 1}`;
  } else {
    to = mode.replace(/^v/, "");
    parseVersion(to, "参数");
  }

  if (compareVersion(to, from) <= 0) {
    fail(`新版本 ${to} 必须大于当前版本 ${from}`);
  }
  if (tagExists(`v${to}`)) {
    fail(`tag v${to} 已存在，请换一个版本号`);
  }

  for (const target of TARGETS) replaceVersion(target, to);
  const cargoLock = updateCargoLock(to);

  console.log(
    JSON.stringify(
      {
        from,
        to,
        updated: TARGETS.map((target) => target.file),
        cargoLock,
      },
      null,
      2,
    ),
  );
}

function main() {
  if (!fs.existsSync(path.join(ROOT, "package.json"))) {
    fail("请在仓库根目录执行（找不到 package.json）");
  }
  const command = process.argv[2];
  if (command === "current") {
    currentCommand();
    return;
  }
  if (command === "bump") {
    bumpCommand(process.argv[3]);
    return;
  }
  fail("用法: node version.mjs <current|bump <major|minor|patch|x.y.z>>");
}

main();
