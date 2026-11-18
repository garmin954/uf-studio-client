#!/usr/bin/env node
/**
 * 发布前的 git 操作：预检 / 提交 / 打 tag / 推送
 *
 *   node git-release.mjs preflight
 *   node git-release.mjs commit   --version 1.0.13 [--message "自定义提交信息"]
 *   node git-release.mjs tag      --version 1.0.13 [--message "自定义 tag 说明"]
 *   node git-release.mjs push     --version 1.0.13
 *
 * 故意拆成三个独立命令：由 SKILL.md 决定执行到哪一步，
 * 避免一次调用里悄悄把 tag 推上去。
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const VERSION_FILES = ["package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml"];
const NOTES_FILES = ["latest.md", "release.md"];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function git(args, { allowFail = false, capture = true } = {}) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0 && !allowFail) {
    fail(`git ${args.join(" ")} 失败:\n${(result.stderr || result.stdout || "").trim()}`);
  }
  return { ok: result.status === 0, out: (result.stdout || "").replace(/\s+$/, "") };
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

function requireVersion(options) {
  const version = String(options.version ?? "").replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    fail("需要合法的 --version，例如 --version 1.0.13");
  }
  return version;
}

function readPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  return pkg.version;
}

function preflight() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out;
  const dirty = git(["status", "--porcelain"]).out.split("\n").filter(Boolean);
  const version = readPackageVersion();

  const REQUIRED_FILES = [...VERSION_FILES, ...NOTES_FILES];
  const changed = dirty
    .map((line) => line.slice(3).trim())
    .filter((file) => REQUIRED_FILES.includes(file));

  const tag = `v${version}`;
  const tagExists = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true }).ok;

  // 用仓库里已有的解析脚本验证 latest.md 结构没被破坏
  const parse = spawnSync(process.execPath, ["scripts/build-release-notes.mjs", "latest.md"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  let notes = null;
  let notesError = null;
  if (parse.status === 0) {
    try {
      notes = JSON.parse(parse.stdout);
      if (!notes.content?.cn || !notes.content?.en) {
        notesError = "latest.md 的 content.cn / content.en 不能为空";
      }
      if (!notes.description?.cn || !notes.description?.en) {
        notesError = notesError ?? "latest.md 的 description.cn / description.en 不能为空";
      }
    } catch (error) {
      notesError = `latest.md 解析结果不是合法 JSON: ${error.message}`;
    }
  } else {
    notesError = (parse.stderr || "scripts/build-release-notes.mjs 执行失败").trim();
  }

  const unexpected = dirty.map((line) => line.slice(3).trim()).filter((file) => !REQUIRED_FILES.includes(file));
  const missing = REQUIRED_FILES.filter((file) => !changed.includes(file));

  const report = {
    branch,
    version,
    tag,
    tagExists,
    changedVersionFiles: VERSION_FILES.filter((file) => changed.includes(file)),
    changedNotesFiles: NOTES_FILES.filter((file) => changed.includes(file)),
    missingChangedFiles: missing,
    otherChanges: unexpected,
    notes,
    notesError,
    ok: Boolean(notes) && !notesError && !tagExists && missing.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) process.exitCode = 1;
}

function commit(options) {
  const version = requireVersion(options);
  const files = [...VERSION_FILES, ...NOTES_FILES].filter((file) => fs.existsSync(path.join(ROOT, file)));

  // --extra 用于「本次发版要一起带上」的额外改动，逗号分隔
  // 例如 --extra .github/workflows/main.yml,.github/workflows/publish-oss.yml,scripts/publish-oss.mjs
  const extra =
    options.extra && options.extra !== true
      ? String(options.extra)
          .split(",")
          .map((file) => file.trim())
          .filter(Boolean)
      : [];
  const missingExtra = extra.filter((file) => !fs.existsSync(path.join(ROOT, file)));
  if (missingExtra.length > 0) fail(`--extra 指定的文件不存在：${missingExtra.join(", ")}`);

  git(["add", "--", ...files, ...extra]);

  const staged = git(["diff", "--cached", "--name-only"]).out;
  if (!staged) fail("没有可提交的变更（版本号或说明文件未修改）");

  const message =
    options.message && options.message !== true
      ? String(options.message)
      : `chore(release): 升级版本至${version}\n\n- 更新 ${VERSION_FILES.join(" / ")}\n- 更新 latest.md / release.md 版本说明`;

  const full = `${message}\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>`;
  git(["commit", "-m", full], { capture: false });

  const hash = git(["rev-parse", "--short", "HEAD"]).out;
  console.log(JSON.stringify({ committed: hash, files: staged.split("\n"), version }, null, 2));
}

function createTag(options) {
  const version = requireVersion(options);
  const tag = `v${version}`;

  if (git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true }).ok) {
    fail(`tag ${tag} 已存在`);
  }
  const status = git(["status", "--porcelain", "--untracked-files=no"]).out;
  if (status) fail(`工作区还有未提交的改动，请先提交：\n${status}`);

  const message =
    options.message && options.message !== true
      ? String(options.message)
      : `UFACTORY Studio v${version}`;
  git(["tag", "-a", tag, "-m", message], { capture: false });
  console.log(JSON.stringify({ tag, message, commit: git(["rev-parse", "--short", "HEAD"]).out }, null, 2));
}

function push(options) {
  const version = requireVersion(options);
  const tag = `v${version}`;
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out;
  if (branch === "HEAD") fail("当前处于 detached HEAD，无法推送分支");

  const remote = git(["remote"]).out.split("\n").filter(Boolean);
  if (remote.length === 0) fail("没有配置 git remote");
  if (!git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true }).ok) {
    fail(`本地没有 tag ${tag}，请先执行 tag 步骤`);
  }

  // 先推分支再推 tag：tag 推上去会触发 release workflow，确保 workflow 拿到的是最终代码。
  // 只推本次的 tag，避免把仓库里遗留的历史 tag 一起推上去。
  git(["push", "origin", `refs/heads/${branch}:refs/heads/${branch}`], { capture: false });
  git(["push", "origin", `refs/tags/${tag}:refs/tags/${tag}`], { capture: false });
  console.log(JSON.stringify({ pushed: { branch, tag } }, null, 2));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (command === "preflight") return preflight();
  if (command === "commit") return commit(options);
  if (command === "tag") return createTag(options);
  if (command === "push") return push(options);
  fail("用法: node git-release.mjs <preflight|commit|tag|push> [--version x.y.z]");
}

main();
