#!/usr/bin/env node
/**
 * 发布完成后通知 uflrs 同步指定 Source。
 *
 *   node notify-uflrs.mjs --version 1.0.13
 *   node notify-uflrs.mjs --version 1.0.13 --run-id 123456
 *   node notify-uflrs.mjs --version 1.0.13 --timeout 1800 --interval 30
 *
 * 前置（环境变量，缺省则整步跳过）：
 *   UFLRS_BASE_URL  例如 http://192.168.1.115:15050
 *   UFLRS_API_KEY   在 uflrs 的 Source 编辑对话框里申请，形如 uflrs_sk_xxxx_yyyy
 *
 * 设计原则：
 *
 * 1. **只在 workflow conclusion = success 时才通知**。`prepare-release` 阶段
 *    Release 就已经 published，但三平台资产要到 build 矩阵跑完才齐全，
 *    此时触发 uflrs 必然拿到「资产不存在」。
 * 2. **失败不阻断发布**。发布本身已经成功，通知失败最多让同步晚一个调度周期。
 *    需要严格失败时加 `--strict`。
 * 3. 只推一次、不重试已成功的请求；5xx 与网络错误退避重试 3 次。
 */
import { spawnSync } from "node:child_process";

const BASE = (process.env.UFLRS_BASE_URL ?? "").trim().replace(/\/+$/, "");
const API_KEY = (process.env.UFLRS_API_KEY ?? "").trim();

const RETRY_DELAYS = [1000, 3000, 9000];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, args, { allowFail = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    // Windows 下 gh 是 .exe，交给 shell 解析更稳
    shell: process.platform === "win32",
  });
  if (result.error) {
    if (allowFail) return { ok: false, out: "", err: result.error.message };
    throw new Error(`${command} 执行失败: ${result.error.message}`);
  }
  const out = (result.stdout ?? "").replace(/\s+$/, "");
  const err = (result.stderr ?? "").trim();
  if (result.status !== 0 && !allowFail) {
    throw new Error(`${command} ${args.join(" ")} 失败:\n${err || out}`);
  }
  return { ok: result.status === 0, out, err };
}

function git(args, options) {
  return run("git", args, options);
}

function gh(args, options) {
  return run("gh", args, options);
}

/** 结束：`--strict` 时返回非 0，否则一律 0（不阻断发布）。 */
function finish(payload, strict, failed) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(strict && failed ? 1 : 0);
}

function requireVersion(options) {
  const version = String(options.version ?? "").replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("用法: node notify-uflrs.mjs --version x.y.z");
  }
  return version;
}

/** 找到本次 tag 触发的 workflow run。 */
function findRunId(version, explicit) {
  if (explicit && explicit !== true) {
    const id = Number(explicit);
    if (!Number.isInteger(id) || id <= 0) throw new Error(`--run-id 非法: ${explicit}`);
    return id;
  }
  const tag = `v${version}`;
  // 用 rev-list 而不是 `rev-parse tag^{commit}`：Windows 的 shell 会吃掉 `^`
  const sha = git(["rev-list", "-n", "1", tag]).out;
  const raw = gh([
    "run",
    "list",
    "--workflow=main.yml",
    "--commit",
    sha,
    "--limit",
    "5",
    "--json",
    "databaseId,event,status,conclusion,createdAt,url",
  ]).out;
  const runs = JSON.parse(raw);
  const picked = runs.find((item) => item.event === "push") ?? runs[0];
  if (!picked) throw new Error(`未找到 ${sha}（${tag}）对应的 workflow run`);
  return picked.databaseId;
}

/** 轮询直到 run 结束；超时返回 timedOut 标记。 */
async function waitForRun(id, timeoutMs, intervalMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  for (;;) {
    const raw = gh(["run", "view", String(id), "--json", "status,conclusion,url"]).out;
    last = JSON.parse(raw);
    if (last.status === "completed") return { ...last, timedOut: false };
    if (Date.now() >= deadline) return { ...last, timedOut: true };
    await sleep(intervalMs);
  }
}

function releaseAssets(version) {
  const raw = gh(["release", "view", `v${version}`, "--json", "assets"]).out;
  return JSON.parse(raw).assets.map((asset) => asset.name);
}

async function postSync(tag, runId) {
  const payload = JSON.stringify({ tag, workflow_run_id: runId });
  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${BASE}/api/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: payload,
        signal: controller.signal,
      });
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      // 5xx 才重试；4xx 是确定性失败，重试没有意义
      if (response.status >= 500 && attempt < RETRY_DELAYS.length) {
        lastError = `HTTP ${response.status}: ${text.slice(0, 200)}`;
        continue;
      }
      return { status: response.status, body, text };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt >= RETRY_DELAYS.length) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`请求 uflrs 失败: ${lastError}`);
}

function describeFailure(status, body) {
  const code = body?.error?.code ?? "";
  if (status === 401) {
    return `API Key 无效、已吊销或已过期（${code}）。用 uflrs api-key list --source <owner/repo> 检查`;
  }
  if (status === 403) {
    return `API Key 无权触发（${code}）：确认这把 Key 属于该 Source，且带 sync 权限`;
  }
  if (status === 429) return "被 uflrs 限流，稍后重试";
  return `uflrs 返回 HTTP ${status}（${code || "未知错误"}）`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const strict = options.strict === true;
  const version = requireVersion(options);
  const tag = `v${version}`;

  // 未配置就整步跳过：这是可选增强，不该让发布流程变复杂
  if (!BASE || !API_KEY) {
    return finish(
      {
        skipped: true,
        reason: "未配置 UFLRS_BASE_URL / UFLRS_API_KEY",
        hint: "在 uflrs 的 Source 编辑对话框申请 API Key，然后写入环境变量",
      },
      strict,
      false,
    );
  }
  if (!API_KEY.startsWith("uflrs_sk_")) {
    return finish(
      { skipped: true, reason: "UFLRS_API_KEY 格式不像 uflrs 的 Source 级 Key（应以 uflrs_sk_ 开头）" },
      strict,
      false,
    );
  }

  let runId;
  try {
    runId = findRunId(version, options["run-id"]);
  } catch (error) {
    return finish({ notified: false, reason: String(error.message ?? error) }, strict, true);
  }

  const timeoutSeconds = Number(options.timeout ?? 900);
  const intervalSeconds = Number(options.interval ?? 20);
  const runInfo = await waitForRun(
    runId,
    Math.max(60, timeoutSeconds) * 1000,
    Math.max(5, intervalSeconds) * 1000,
  );

  if (runInfo.timedOut) {
    return finish(
      {
        notified: false,
        reason: `等待超时（${timeoutSeconds}s），workflow 仍在 ${runInfo.status}`,
        run_id: runId,
        url: runInfo.url,
        hint: "构建完成后重跑本脚本即可，或依赖 uflrs 的定时同步兜底",
      },
      strict,
      true,
    );
  }

  if (runInfo.conclusion !== "success") {
    return finish(
      {
        notified: false,
        reason: `workflow 未成功（conclusion=${runInfo.conclusion}），不触发同步`,
        run_id: runId,
        url: runInfo.url,
      },
      strict,
      true,
    );
  }

  // 资产齐全性检查：release 在 build 之前就存在，这一步防止「通知了但没东西可下」
  let assets = [];
  if (options["skip-assets"] !== true) {
    try {
      assets = releaseAssets(version);
      const minAssets = Number(options["min-assets"] ?? 3);
      if (assets.length < minAssets) {
        return finish(
          {
            notified: false,
            reason: `Release 资产不足（${assets.length} < ${minAssets}），可能尚未上传完`,
            run_id: runId,
            assets,
            hint: "稍后重跑，或用 --min-assets 调整阈值 / --skip-assets 跳过检查",
          },
          strict,
          true,
        );
      }
    } catch (error) {
      // 资产查询失败不阻断：uflrs 自己会判断
      assets = [];
      console.error(`warning: 读取 Release 资产失败: ${error.message ?? error}`);
    }
  }

  let result;
  try {
    result = await postSync(tag, runId);
  } catch (error) {
    return finish(
      {
        notified: false,
        reason: String(error.message ?? error),
        hint: "确认 uflrs 正在运行、地址可达；同步会在下一个调度周期兜底",
      },
      strict,
      true,
    );
  }

  if (result.status === 202) {
    return finish(
      {
        notified: true,
        tag,
        run_id: runId,
        uflrs_run_id: result.body?.run_id ?? null,
        deduplicated: result.body?.deduplicated ?? false,
        status: result.body?.status ?? null,
        assets: assets.length,
      },
      strict,
      false,
    );
  }
  if (result.status === 200) {
    return finish(
      { notified: true, tag, run_id: runId, status: result.body?.status ?? "up_to_date", assets: assets.length },
      strict,
      false,
    );
  }

  return finish(
    {
      notified: false,
      reason: describeFailure(result.status, result.body),
      http_status: result.status,
      body: result.body ?? result.text.slice(0, 300),
      run_id: runId,
    },
    strict,
    true,
  );
}

main().catch((error) => {
  const strict = process.argv.includes("--strict");
  console.error(`error: ${error.message ?? error}`);
  process.exit(strict ? 1 : 0);
});
