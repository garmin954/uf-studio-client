#!/usr/bin/env node
/**
 * 生成 release.md / latest.md
 *
 *   node notes.mjs draft --version 1.0.13 [--from v1.0.12] [--to HEAD]
 *       → 打印 JSON 草稿（提交列表 + 建议的中英文文案），供人工/模型润色
 *
 *   node notes.mjs write --version 1.0.13 --zh-file zh.txt --en-file en.txt
 *       [--desc-zh "..."] [--desc-en "..."] [--force-update true]
 *       → 按现有格式写入 release.md 和 latest.md
 *
 * latest.md 由 scripts/build-release-notes.mjs 解析，字段顺序不能变：
 *   # force_update / # description(## zhCn, ## enUs) / # content(## zhCn, ## enUs)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CJK = /[一-鿿]/;
const SKIP_SUBJECT = [/^chore\(release\)/i, /^chore:\s*(bump|release|update) version/i, /^Merge\b/i];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function git(args, { allowFail = false } = {}) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0 && !allowFail) {
    fail(`git ${args.join(" ")} 失败: ${(result.stderr || "").trim()}`);
  }
  return result.status === 0 ? result.stdout.trim() : "";
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    } else {
      options._.push(token);
    }
  }
  return options;
}

function readTextFile(rel) {
  try {
    return fs.readFileSync(path.resolve(ROOT, rel), "utf8");
  } catch (error) {
    fail(`读取 ${rel} 失败: ${error.message}`);
  }
}

function normalizeBlock(text, where) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length === 0) fail(`${where} 内容为空`);
  if (lines.some((line) => /^#{1,2}\s/.test(line.trim()))) {
    fail(`${where} 中不能再出现 #/## 标题（会破坏 latest.md 的章节结构）`);
  }
  return lines.join("\n");
}

function firstMeaningfulLine(text) {
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.length > 0);
  return (line ?? "").replace(/^[-*]\s+/, "").replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, "");
}

function lastTag() {
  return git(["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"], { allowFail: true });
}

function collectCommits(from, to) {
  const range = from ? `${from}..${to}` : to;
  const raw = git(["log", "--no-merges", "--format=%s", range], { allowFail: true });
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((subject) => !SKIP_SUBJECT.some((pattern) => pattern.test(subject)));
}

function bulletize(subjects) {
  return subjects.map((subject) => `- ${subject}`).join("\n");
}

function draft(options) {
  const version = String(options.version ?? "").replace(/^v/, "");
  if (!version) fail("draft 需要 --version");

  const from = options.from && options.from !== true ? options.from : lastTag();
  const to = options.to && options.to !== true ? options.to : "HEAD";
  const commits = collectCommits(from, to);

  const zhCommits = commits.filter((subject) => CJK.test(subject));
  const enCommits = commits.filter((subject) => !CJK.test(subject));
  const zhText = bulletize(zhCommits.length ? zhCommits : commits);
  const enText = bulletize(enCommits.length ? enCommits : commits);

  const payload = {
    version,
    from: from || null,
    to,
    commits,
    zh: zhText,
    en: enText,
    descZh: firstMeaningfulLine(zhText),
    descEn: firstMeaningfulLine(enText),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function writeNotes(options) {
  const version = String(options.version ?? "").replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+/.test(version)) fail("write 需要合法的 --version");

  const zhRaw = options["zh-file"] ? readTextFile(String(options["zh-file"])) : options["zh-text"];
  const enRaw = options["en-file"] ? readTextFile(String(options["en-file"])) : options["en-text"];
  if (!zhRaw || zhRaw === true) fail("缺少中文内容：--zh-file <文件> 或 --zh-text <文本>");
  if (!enRaw || enRaw === true) fail("缺少英文内容：--en-file <文件> 或 --en-text <文本>");

  const zh = normalizeBlock(String(zhRaw), "中文内容");
  const en = normalizeBlock(String(enRaw), "英文内容");

  const descZh = options["desc-zh"] && options["desc-zh"] !== true ? String(options["desc-zh"]).trim() : firstMeaningfulLine(zh);
  const descEn = options["desc-en"] && options["desc-en"] !== true ? String(options["desc-en"]).trim() : firstMeaningfulLine(en);
  if (!descZh || !descEn) fail("description 不能为空，请用 --desc-zh / --desc-en 指定");
  if (/[\r\n]/.test(descZh + descEn)) fail("description 必须是单行文本");

  const forceRaw = String(options["force-update"] ?? "false").toLowerCase();
  const forceUpdate = ["true", "1", "yes", "y"].includes(forceRaw);

  // 与现有 latest.md 完全一致的章节顺序
  const latest = [
    "# force_update",
    forceUpdate ? "true" : "false",
    "# description",
    "## zhCn",
    descZh,
    "## enUs",
    descEn,
    "# content",
    "## zhCn",
    zh,
    // 现有文件里中文正文与 ## enUs 之间是两个空行，这里必须保持一致
    "",
    "",
    "## enUs",
    en,
    "",
  ].join("\n");

  // 与现有 release.md 完全一致的章节顺序
  const release = [
    `### ✨✨✨更新版本到v${version}`,
    "",
    "## zhCn",
    zh,
    // 同上：两个空行
    "",
    "",
    "## enUs",
    en,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(ROOT, "latest.md"), latest, "utf8");
  fs.writeFileSync(path.join(ROOT, "release.md"), release, "utf8");

  console.log(
    JSON.stringify({ version, forceUpdate, descZh, descEn, files: ["latest.md", "release.md"] }, null, 2),
  );
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (command === "draft") {
    draft(options);
    return;
  }
  if (command === "write") {
    writeNotes(options);
    return;
  }
  fail("用法: node notes.mjs <draft|write> [...options]");
}

main();
