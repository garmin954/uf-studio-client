---
name: release-version
description: 升级 UFACTORY Studio 版本号并发布。当用户说「发版」「发布新版本」「升级版本号」「bump version」「打个 tag 发布」或要求更新 latest.md / release.md 说明时使用。列出 major/minor/patch/custom 选项，同步 package.json、tauri.conf.json、Cargo.toml，按原格式重写 latest.md 与 release.md，然后提交、打 tag、推送并触发 release workflow。
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion
---

# 发布新版本（UFACTORY Studio）

本仓库是 Tauri 2 桌面应用，一次「发版」= 改版本号 + 改更新说明 + 提交 + 打 tag 推送。
推 `v*` tag 会自动触发 `.github/workflows/main.yml`：构建三平台安装包 → 创建 GitHub Release → 上传阿里云 OSS。

**所有命令都在仓库根目录 `D:\rust\uf-studio-client` 执行。**

## 前置检查

```bash
node .claude/skills/release-version/scripts/version.mjs current
git status --porcelain
# 可选：第 7 步要用的 uflrs 配置（未配置则整步跳过）
echo "uflrs: ${UFLRS_BASE_URL:-<未配置>} key=${UFLRS_API_KEY:+<已配置>}"
```

- `current` 输出各文件版本号；`consistent` 为 `false` 时先停下来告诉用户版本号已经不一致，不要继续。
- 工作区有未提交改动时提示用户，本 skill 的 `commit` 只会 `git add` 版本号与说明文件，不会提交其它改动。

## 第 1 步：选择版本类型

用 `AskUserQuestion` 问用户，**先把当前版本算出来放在问题里**（例如「当前 1.0.12」）：

| 选项 label | 计算 | 说明 |
| --- | --- | --- |
| `major（主版本）` | `2.0.0` | 有破坏性变更 |
| `minor（次版本）` | `1.1.0` | 新增功能，向下兼容 |
| `patch（补丁版本）` | `1.0.13` | 修 bug，默认推荐 |
| `custom（自定义）` | 用户输入 | 需用户提供完整 `x.y.z` |

`header` 用「版本类型」，`multiSelect: false`。用户选 custom 时，追问一句「请输入完整版本号，例如 1.2.0」。

**注意**：版本号的唯一基准是 `package.json`，不是 `git tag`。仓库里存在 `v1.1.4`、`v1.0.121` 这类历史 tag，不要用「最新 tag +1」来推算。

## 第 2 步：改版本号

```bash
node .claude/skills/release-version/scripts/version.mjs bump patch    # 或 minor / major / 1.2.3
```

脚本会：
- 同步 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 的版本号；
- 若存在 `src-tauri/Cargo.lock`（已被 gitignore），同步其中 `UFACTORY-Studio` 的版本；
- 新版本必须大于当前版本，且 `v<新版本>` tag 不能已存在，否则直接报错退出。

输出 JSON 含 `from` / `to`，把 `to` 记下来用于后面所有步骤。

## 第 3 步：生成 latest.md 与 release.md

先拿一份草稿（提交列表 + 建议文案）：

```bash
node .claude/skills/release-version/scripts/notes.mjs draft --version <to> --from <最近的发布 tag>
```

输出 `commits / zh / en / descZh / descEn`。`--from` 一般用上一个真正的发布 tag（如 `v1.0.12`）。

然后**由你写文案**，规则：

- `release.md`：面向用户的功能列表，中文和英文各一段，条目用 `- ` 开头，可以写多行。
- `latest.md`：`content` 与 `release.md` 正文一致；`description` 是单行摘要。
- 中英文都要有，不能为空，不要出现 `#` / `##` 标题（会破坏解析结构）。
- 只写用户可感知的变化；`chore(release)`、版本号提交不要写进去。
- 不要编造没有的改动；提交信息不足以说明时，问用户要一句描述。

写入（脚本负责格式，不要手写这两个文件）：

```bash
node .claude/skills/release-version/scripts/notes.mjs write \
  --version <to> \
  --zh-file <中文正文临时文件> --en-file <英文正文临时文件> \
  --desc-zh "<一行中文摘要>" --desc-en "<one-line English summary>" \
  --force-update false
```

产出格式与当前仓库完全一致：

```markdown
# force_update
false
# description
## zhCn
<一行中文摘要>
## enUs
<one-line English summary>
# content
## zhCn
<中文正文>

## enUs
<英文正文>
```

```markdown
### ✨✨✨更新版本到v<to>

## zhCn
<中文正文>

## enUs
<英文正文>
```

`--force-update true` 仅在用户明确要求强制更新时使用。

## 第 4 步：校验

```bash
node .claude/skills/release-version/scripts/git-release.mjs preflight
```

必须满足：`ok: true`、`notesError: null`、`changedVersionFiles` 三个文件齐全、`changedNotesFiles` 两个文件齐全。`preflight` 内部会调用仓库原有的 `scripts/build-release-notes.mjs` 解析 `latest.md`，确认结构没坏。

失败时按 `notesError` 修正后重跑，不要跳过。

## 第 5 步：提交 / tag / 推送（要用户确认）

用 `AskUserQuestion` 问清楚做到哪一步（`header`：「发布操作」，`multiSelect: false`）：

| 选项 label | 行为 |
| --- | --- |
| `仅提交` | commit，不 tag 不推送 |
| `提交+tag` | commit + 本地 tag，不推送 |
| `提交+tag+推送`（推荐） | commit + tag + push，推送后自动触发构建和 OSS 发布 |

按选择依次执行：

```bash
node .claude/skills/release-version/scripts/git-release.mjs commit --version <to>
node .claude/skills/release-version/scripts/git-release.mjs tag    --version <to>
node .claude/skills/release-version/scripts/git-release.mjs push   --version <to>
```

- `commit` 只提交 `package.json / tauri.conf.json / Cargo.toml / latest.md / release.md`，无变更会报错。
- `tag` 用带注释的 annotated tag，工作区有未提交改动时拒绝执行。
- `push` 先推分支再推 tag（先代码后 tag），且只推本次的 tag，不会把仓库里的历史 tag 一起推上去；tag 推上去即触发 release workflow。
- 若当前在默认分支（`main`）上，按本仓库的发布惯例可以直接提交打 tag；如果用户或团队规则要求先开分支，则先创建 release 分支再走后续步骤。

## 第 6 步：确认发布

推送后告诉用户：

- tag 名：`v<to>`
- 这次 workflow 会做：三平台打包 → GitHub Release → `latest.json` 上传到 `https://update.ufactory.cc/releases/studio_client/latest.json`
- 本地查看进度：`gh run list --workflow=main.yml --limit 3`

## 第 7 步：通知 uflrs（可选，失败不阻断）

内网 uflrs 负责把 Release 资产同步到局域网分发目录。如果配置了这两个环境变量，
就在 workflow 成功后触发一次定向同步：

| 变量 | 说明 |
| --- | --- |
| `UFLRS_BASE_URL` | 例如 `http://192.168.1.115:15050` |
| `UFLRS_API_KEY` | uflrs 里该 Source 的 API Key，形如 `uflrs_sk_a1b2c3d4_…` |

```bash
node .claude/skills/release-version/scripts/notify-uflrs.mjs --version <to>
```

脚本的行为：

- 用 `git rev-list -n 1 v<to>` 找到对应 commit，再找本次 tag 触发的 workflow run，轮询到结束；
- **只有 `conclusion=success` 才发请求**。`prepare-release` 阶段 Release 就已经
  published，但三平台资产要到 `build` 跑完才齐全，早发必然让 uflrs 拿到「资产不存在」；
- 发请求前检查 Release 资产数量（默认 ≥3），防止资产还没上传完；
- 未配置环境变量时直接跳过（输出 `skipped: true`），不算失败；
- 退出码默认 0，只有加 `--strict` 才会在失败时返回 1。

常用参数：

| 参数 | 说明 |
| --- | --- |
| `--timeout 2400` | 默认只等 900 秒；三平台构建更久时调大 |
| `--run-id 123456` | 已知 run id 时跳过查找 |
| `--skip-assets` | 跳过资产数量检查 |
| `--min-assets 5` | 调整资产阈值 |

输出是 JSON，关注 `notified` / `uflrs_run_id` / `deduplicated` / `reason`：

- `deduplicated: true` 表示 uflrs 上该 Source 已有活动任务，复用了同一个 run；
- `reason: "workflow 未成功"` → 先修构建，不要通知；
- `reason: "Release 资产不足"` → 稍后重跑脚本；
- `reason: "API Key 无效、已吊销或已过期"` → 去 uflrs 的 Source 编辑对话框重新申请。

**通知失败不回滚发布**：发布本身已经成功，同步最多晚一个调度周期（uflrs 有定时兜底）。

## 红线

- 不要手写 `latest.md` / `release.md`，一律走 `notes.mjs write`，否则格式漂移会导致客户端解析失败。
- 不要修改 `.ugp/` 里的任何内容（含 Tauri 签名私钥），也不要把密钥内容打印到终端或写进日志。
- 不要用 `git push --force`、`git tag -d` 清理历史 tag，也不要 `--no-verify` 跳过钩子。
- 用户没有明确要求时，不要推送、不要创建 GitHub Release。
- 不要因为第 7 步通知失败就回滚发布或删 tag——同步失败是次要问题，交给 uflrs 的定时兜底。
- 提交信息末尾保留 `Co-Authored-By: Claude Code <noreply@anthropic.com>`（脚本已自动加）。
