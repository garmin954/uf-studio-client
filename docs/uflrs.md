# uflrs — UFACTORY Studio 局域网发布同步服务（Web 管理版）

> 服务名：`uflrs`（UFACTORY LAN Release Service；systemd unit：`uflrs.service`）。
>
> 本文档是方案与运维说明，不包含同步程序的实现代码。
>
> 本文档描述的是 **常驻 Web 服务 + 内置调度器** 的方案，替代之前的 `timer + oneshot service` 方案。
> 服务启动后会在 `http://192.168.1.19:5050` 提供浏览器管理界面，并负责每天定时同步 GitHub Release。

---

## 1. 目标

把 GitHub Actions 打包并发布到 GitHub Release 的安装包，按配置自动同步到局域网共享目录：

```text
\\192.168.1.19\releases\xarm
```

并且：

- **只从 GitHub 拉取，不依赖阿里云 OSS**；
- 不需要 self-hosted runner；
- 不需要把 SMB 共享暴露到公网；
- 以 systemd 常驻服务运行，可以像 `nginx.service` / `docker.service` 一样用 `systemctl` 控制；
- 提供 Web 管理界面：
  - 添加多条 GitHub 下拉源；
  - 为每个源配置独立的 GitHub Token；
  - 查看和控制同步状态；
  - 设置全局保存路径；
  - 设置每天定时下载的时间；
  - 设置每个源的保存子路径（只能选在全局路径下）；
  - 手动触发同步、取消任务、查看日志和历史记录；
- 同步后生成局域网更新清单 `releases.json` / `releases_beta.json`，让客户端可以通过内网更新源检查更新。

---

## 2. 总体架构

```text
浏览器
  │ http://192.168.1.19:5050
  ▼
┌─────────────────────────────────────────────────────────────┐
│ uflrs.service（常驻，Type=simple）                │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Web UI / API │   │ 调度器        │   │ 任务队列         │  │
│  │ 端口 5050     │◄──│ 每天 12:00 等 │──►│ 同一时间 1 个任务 │  │
│  └──────────────┘   └──────────────┘   └────────┬────────┘  │
│           │                                      │           │
│           ▼                                      ▼           │
│  ┌─────────────────┐                  ┌──────────────────┐  │
│  │ SQLite          │                  │ 同步 Worker       │  │
│  │ 配置 / 状态 / 历史│                  │ 下载 / 校验 / 清单 │  │
│  └─────────────────┘                  └────────┬─────────┘  │
└────────────────────────────────────────────────┼─────────────┘
                                                 │ HTTPS 出站
                                                 ▼
                                        GitHub Release
                                  ┌──────────────────────────┐
                                  │ Source A: UFACTORY Studio│
                                  │ Source B: 其他工具        │
                                  │ Source C: 预发布仓库      │
                                  └──────────────────────────┘
                                                 │
                                                 ▼
                              /srv/releases/xarm/<target_subdir>/
                                  ├─ releases.json
                                  ├─ releases_beta.json
                                  └─ v<version>/
                                       ├─ 安装包
                                       └─ .sig
                                                 │
                                                 │ nginx 静态服务
                                                 ▼
                         http://192.168.1.19/releases/xarm/<target_subdir>/
                                                 │
                                                 ▼
                                        局域网客户端检查更新
```

---

## 3. 进程模型与 systemd

### 3.1 为什么改成常驻服务

需要在浏览器里配置和管理，所以服务不能是“执行一次就退出”的 oneshot，而应该是常驻进程：

- `uflrs.service`：`Type=simple`，启动后一直运行；
- 内部同时承担：
  - Web 服务（端口 5050）；
  - REST API；
  - 页面静态资源；
  - 定时调度器；
  - 同步任务队列和 Worker；
  - SQLite 配置/状态存储；
- `systemctl status` 会显示 `active (running)`，和 nginx 类似；
- `systemctl restart` 会重启 Web 服务，正在执行的同步任务会被标记为中断，下一次重新执行。

### 3.2 不再需要 timer

之前方案里的 timer 不再需要：

- 定时时间在 Web 界面的“总设置”里配置；
- 修改时间后调度器立即重新计算下一次执行时间，不需要 `daemon-reload`；
- 服务重启后，调度器重新加载配置；
- 如果服务在定时时间点没有运行，启动时可以根据配置决定是否“补跑”一次。

如果之前已经安装过 timer，需要先禁用：

```bash
sudo systemctl disable --now <旧 timer 的 unit 名>
```

### 3.3 服务状态和任务状态要分开看

- **服务状态**：`systemctl status uflrs.service`，表示 Web 服务是否在运行；
- **任务状态**：在 Web 页面“同步源 / 历史记录”里查看，表示某一次同步成功、失败、进行中还是已取消；
- 服务一直在运行，不代表某个 GitHub 源同步成功；
- 某个源同步失败，不会导致整个服务退出，也不会影响其他源。

---

## 4. 部署位置与前置条件

### 4.1 推荐部署位置

**最推荐：直接部署在 `192.168.1.19` 上。**

原因：

- nginx 和 Samba 都在这台机器上；
- 同步程序直接写本地目录，不需要 SMB 凭据；
- 不存在共享权限、网络映射、凭据泄露问题；
- 写入后 nginx 立即可以对外提供文件。

如果无法登录这台服务器，也可以部署在局域网内另一台常开的 Linux 机器上，但需要额外处理 SMB 挂载和凭据。

### 4.2 前置条件

- Linux + systemd；
- nginx 正常提供 `/releases/xarm/` 静态文件；
- 同步服务对目标目录有写权限；
- 能出站访问以下域名：
  - `api.github.com`
  - `github.com`
  - `objects.githubusercontent.com`
- 如果复用仓库现有脚本，需要 Node.js 22；
- 建议使用 SQLite 存储配置和状态；
- 服务器时间正确，建议时区为 `Asia/Shanghai`；
- 浏览器能访问 `http://192.168.1.19:5050`；
- 可选的只读 GitHub Token（公共仓库可以不加，但加了更稳，避免 API 限流）。

检查时区：

```bash
timedatectl
```

如果不是中国时区：

```bash
sudo timedatectl set-timezone Asia/Shanghai
```

### 4.3 防火墙

Web 界面只允许局域网访问，不要把 5050 端口暴露到公网。

使用 `ufw` 时示例：

```bash
sudo ufw allow from 192.168.1.0/24 to any port 5050 proto tcp
sudo ufw deny 5050/tcp
```

使用 `firewalld` 时示例：

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port port="5050" protocol="tcp" accept'
sudo firewall-cmd --reload
```

如果服务器有公网 IP，必须确认云安全组 / 路由器没有把 5050 映射出去。

---

## 5. 路径模型：三层目录约束

这是整个系统最重要的安全设计。路径分为三层：

```text
① ALLOWED_ROOT        系统级允许根目录（systemd 只允许写这里）
        │
        ▼
② global_root         总设置里的“全局保存路径”，必须在 ALLOWED_ROOT 下
        │
        ▼
③ source.target_subdir 每个同步源的保存子路径，必须是相对路径，且必须在 global_root 下
```

示例：

```text
ALLOWED_ROOT      = /srv/releases/xarm
global_root       = /srv/releases/xarm
source A 目标     = studio_client
source B 目标     = xarm_tool
source C 目标     = beta/studio_client
```

最终写入：

```text
/srv/releases/xarm/studio_client/
/srv/releases/xarm/xarm_tool/
/srv/releases/xarm/beta/studio_client/
```

对应 SMB：

```text
\\192.168.1.19\releases\xarm\studio_client
\\192.168.1.19\releases\xarm\xarm_tool
\\192.168.1.19\releases\xarm\beta\studio_client
```

对应 HTTP：

```text
http://192.168.1.19/releases/xarm/studio_client
http://192.168.1.19/releases/xarm/xarm_tool
http://192.168.1.19/releases/xarm/beta/studio_client
```

### 5.1 约束规则

- `ALLOWED_ROOT` 是系统级边界，写在 systemd 的 `ReadWritePaths` 里；
- `global_root` 可以在 Web 总设置里修改，但必须位于 `ALLOWED_ROOT` 下；
- `source.target_subdir` 只能是相对路径；
- 禁止：
  - 绝对路径；
  - `..`；
  - `.`；
  - 空路径；
  - 指向 `global_root` 之外的符号链接；
  - 覆盖系统目录、配置目录、数据库目录、缓存目录；
- 后端必须在每次保存和每次任务执行前重新校验路径，不能只依赖前端；
- 前端路径选择器只能列出 `global_root` 下的子目录，不允许自由输入绝对路径；
- 如果修改了 `global_root`，所有源的相对路径重新解析；如果某个源解析后跑到新 `global_root` 之外，必须阻止保存并提示。

### 5.2 路径与客户端地址

假设：

```text
ALLOWED_ROOT   = /srv/releases/xarm
global_root    = /srv/releases/xarm
HTTP 基础地址  = http://192.168.1.19/releases/xarm
```

某个源的目标子路径是 `studio_client`，那么：

| 类型 | 地址 |
|---|---|
| 本地 | `/srv/releases/xarm/studio_client` |
| SMB | `\\192.168.1.19\releases\xarm\studio_client` |
| HTTP | `http://192.168.1.19/releases/xarm/studio_client` |
| 稳定清单 | `http://192.168.1.19/releases/xarm/studio_client/releases.json` |
| 预发布清单 | `http://192.168.1.19/releases/xarm/studio_client/releases_beta.json` |

**注意**：客户端 `tauri.conf.json` 当前内置的稳定版内网地址是：

```text
http://192.168.1.19/releases/xarm/studio_client/releases.json
```

但 `src-tauri/src/commands/tools.rs` 里预发布地址目前仍然指向：

```text
http://192.168.1.19/releases/xarm/client/releases_beta.json
```

如果统一使用 `studio_client`，需要把预发布地址也改成：

```text
http://192.168.1.19/releases/xarm/studio_client/releases_beta.json
```

服务端的 `target_subdir` 必须与客户端 endpoint 保持一致，不能只改一边。文档里的 `studio_client` / `client` 都是示例，最终以总设置里的 `global_root` 和每个源的 `target_subdir` 为准。

---

## 6. 文件与目录规划

```text
/usr/local/bin/uflrs                       # 服务入口
/usr/local/lib/uflrs/                      # 程序文件
  ├─ web/                                             # Web UI 静态资源
  ├─ latest-json.mjs                                  # 复用仓库脚本
  └─ build-release-notes.mjs                          # 复用仓库脚本

/etc/uflrs/config.yaml                     # 非敏感配置
/etc/uflrs/env                             # 敏感环境变量（权限 600）
/etc/uflrs/master.key                      # Token 加密主密钥（权限 600，root）
/etc/systemd/system/uflrs.service          # systemd 常驻服务

/var/lib/uflrs/state.db                    # SQLite：配置、源、任务历史
/var/lib/uflrs/logs/                       # 可选的任务日志
/var/cache/uflrs/                          # 下载临时目录

/srv/releases/xarm/                                   # ALLOWED_ROOT
  └─ <global_root>/
       └─ <target_subdir>/
            ├─ releases.json
            ├─ releases_beta.json
            └─ v<version>/
                 ├─ 安装包
                 └─ .sig
```

说明：

- `config.yaml` 和数据库负责业务配置；
- `master.key` 只用于加密源 Token，不能提交到仓库；
- `global_root` 和 `target_subdir` 由 Web 界面配置；
- systemd 的 `ReadWritePaths` 只放行 `ALLOWED_ROOT`，这是最后一道防线。

---

## 7. 数据模型

建议使用 SQLite（WAL 模式），文件放在：

```text
/var/lib/uflrs/state.db
```

### 7.1 `settings`

保存全局设置，键值或单行结构均可：

| 字段 | 说明 |
|---|---|
| `global_root` | 全局保存路径，必须在 `ALLOWED_ROOT` 下 |
| `http_base_url` | 对外 HTTP 基础地址，例如 `http://192.168.1.19/releases/xarm` |
| `schedule_times` | 定时时间列表，例如 `["12:00"]` |
| `timezone` | 时区，默认 `Asia/Shanghai` |
| `catch_up_on_start` | 服务启动时是否补跑错过的定时任务 |
| `max_concurrent_jobs` | 同时执行的同步任务数，默认 1 |
| `web_bind` | Web 监听地址，默认 `0.0.0.0` |
| `web_port` | Web 端口，默认 `5050` |
| `admin_username` | 管理员用户名 |
| `admin_password_hash` | 管理员密码哈希，不保存明文 |
| `github_api_base` | 默认 `https://api.github.com` |
| `proxy_url` | 可选 HTTP/HTTPS 代理 |
| `retry_count` | 下载失败重试次数 |
| `retry_delay_seconds` | 重试间隔 |
| `download_timeout_seconds` | 单次下载超时 |
| `verify_sha256` | 是否校验 SHA256 |
| `retention_versions` | 每个源保留多少个版本，0 表示不自动清理 |
| `stable_manifest_name` | 默认 `releases.json` |
| `prerelease_manifest_name` | 默认 `releases_beta.json` |
| `log_level` | `info` / `debug` / `warn` / `error` |

### 7.2 `sources`

每个 GitHub 下拉源一行：

| 字段 | 说明 |
|---|---|
| `id` | 唯一 ID |
| `name` | 显示名称，例如“UFACTORY Studio 稳定版” |
| `repo` | `owner/repo`，例如 `garmin954/uf-studio-client` |
| `channel` | `stable` / `prerelease` / `both` |
| `token_ciphertext` | 加密后的 GitHub Token，可为空 |
| `enabled` | 是否启用 |
| `target_subdir` | 相对 `global_root` 的保存子路径 |
| `schedule_override` | 可选，覆盖全局定时时间 |
| `created_at` / `updated_at` | 时间戳 |
| `last_run_at` | 最近一次执行时间 |
| `last_success_at` | 最近一次成功时间 |
| `last_version` | 最近一次成功同步的版本 |
| `last_error` | 最近一次错误摘要 |

### 7.3 `runs`

每次同步任务一行：

| 字段 | 说明 |
|---|---|
| `id` | 任务 ID |
| `source_id` | 关联的源 |
| `trigger` | `schedule` / `manual` / `retry` |
| `status` | `queued` / `running` / `success` / `failed` / `cancelled` / `interrupted` |
| `started_at` / `finished_at` | 时间 |
| `version` | 本次同步的版本 |
| `bytes_downloaded` | 下载字节数 |
| `files` | 文件数量或 JSON 摘要 |
| `error` | 错误信息 |
| `log_path` | 可选，任务日志文件 |

### 7.4 `audit_log`

记录管理操作：

- 谁（管理员）；
- 什么时间；
- 来源 IP；
- 修改了哪个源 / 哪个设置；
- 是否成功；
- Token 只记录“已更新”，不记录明文。

### 7.5 数据库维护

- 使用 WAL 模式，允许 Web 服务和 Worker 并发读写；
- 定期备份 `state.db`；
- 备份时同时备份 `master.key`，否则 Token 无法解密；
- 不要把数据库和 `master.key` 放在同一个可公开访问的目录。

---

## 8. 总设置（General Settings）

Web 界面中的“总设置”至少包含以下内容。

### 8.1 路径

| 设置 | 说明 |
|---|---|
| 全局保存路径 `global_root` | 只允许选择 `ALLOWED_ROOT` 下的目录；保存前后端再次校验 |
| 对外 HTTP 基础地址 `http_base_url` | 用于生成清单里的安装包 URL |
| 允许根目录 `ALLOWED_ROOT` | 系统级配置，通常只读展示，修改需要改 systemd 配置并重启 |
| 保留版本数 `retention_versions` | 0 表示不清理；大于 0 时只清理匹配 `v*` 的旧版本目录 |

### 8.2 定时

| 设置 | 说明 |
|---|---|
| 定时时间 `schedule_times` | 默认 `12:00`，支持多个时间，例如 `12:00`、`18:00` |
| 时区 `timezone` | 默认 `Asia/Shanghai` |
| 启动补跑 `catch_up_on_start` | 服务启动时，如果错过了上次计划时间，是否补跑一次 |
| 最大并发任务数 | 默认 1，避免多个 GitHub 下载同时抢占带宽 |
| 失败重试次数 / 间隔 | 下载失败时的重试策略 |

### 8.3 Web 服务

| 设置 | 说明 |
|---|---|
| 监听地址 `web_bind` | 默认 `0.0.0.0`；也可以绑定到 `192.168.1.19` |
| 端口 `web_port` | 默认 `5050` |
| 管理员用户名 | 默认 `admin` |
| 管理员密码 | 只保存哈希；首次启动生成初始密码或从环境变量读取 |
| 会话密钥 | 用于签名登录 Cookie，放在 `/etc/uflrs/env` |
| 是否强制 HTTPS | 如果前面有 nginx 反向代理，可以开启 |

### 8.4 GitHub

| 设置 | 说明 |
|---|---|
| API 地址 | 默认 `https://api.github.com` |
| 默认 User-Agent | 建议包含服务名和版本 |
| 代理地址 | 可选，例如公司代理 |
| 默认 Token | 可选，作为没有单独配置 Token 的源的兜底 |
| 是否允许 GitHub Enterprise | 如果允许，需要把主机名加入白名单 |

### 8.5 同步行为

| 设置 | 说明 |
|---|---|
| 是否校验 SHA256 | 默认开启 |
| 是否校验 `.sig` | 默认开启 |
| 清单文件名 | 稳定版 / 预发布版 |
| 是否自动清理旧版本 | 默认关闭 |
| 日志级别 | 默认 `info` |

### 8.6 修改后的生效方式

- 定时时间、源配置、路径等业务设置：保存后立即生效，调度器重新计算下一次执行；
- Web 端口、监听地址：保存后提示需要重启服务；
- `ALLOWED_ROOT`：不在 Web 界面直接修改；需要改 systemd 配置并重启；
- 修改 `global_root` 时，必须校验所有已存在的源仍然位于新路径下。

---

## 9. GitHub 下拉源管理

### 9.1 源配置字段

每个“GitHub 下拉源”包含：

| 字段 | 必填 | 说明 |
|---|---|---|
| 名称 | 是 | 显示名称 |
| 仓库 | 是 | `owner/repo` |
| 分支/通道 | 是 | `stable` / `prerelease` / `both` |
| Token | 否 | 公共仓库可不填；私有仓库或需要提高 API 限额时填写 |
| 保存子路径 | 是 | 相对 `global_root`，只能从下拉树中选择 |
| 启用 | 是 | 关闭后不参与定时任务，但保留配置 |
| 独立定时时间 | 否 | 不填则使用总设置的时间 |
| 备注 | 否 | 方便区分多个源 |

### 9.2 多条源的典型用法

```text
源 1：UFACTORY Studio 稳定版
  repo: garmin954/uf-studio-client
  channel: stable
  target_subdir: studio_client
  定时: 使用总设置 12:00

源 2：UFACTORY Studio 预发布
  repo: garmin954/uf-studio-client
  channel: prerelease
  target_subdir: studio_client
  定时: 使用总设置 12:00
  说明: 只更新 releases_beta.json，不覆盖 releases.json

源 3：其他工具
  repo: some-org/some-tool
  channel: stable
  target_subdir: xarm_tool
  定时: 18:00
```

### 9.3 Token 规则

- 公共仓库：不填 Token 也可以下载 Release 资产，但 GitHub API 有速率限制；
- 私有仓库：必须填写 Token；
- 建议使用 fine-grained Token，只给目标仓库 `Contents: read`；
- 每个源可以配置不同的 Token，便于分摊速率限制；
- Token 在数据库里加密保存；
- Web 界面只显示掩码，例如 `github_pat_****abcd`；
- 编辑源时留空表示“不修改 Token”；提供“清除 Token”按钮；
- 后端日志、错误信息、任务日志中必须过滤 Token；
- 提供“测试连接”按钮，检查仓库是否可访问、Token 是否有效、速率限制还剩多少。

### 9.4 保存路径选择

保存路径只能从总设置的 `global_root` 下面选择：

- 下拉树只显示 `global_root` 下的子目录；
- 支持“新建子目录”；
- 不允许输入绝对路径；
- 不允许 `..`；
- 后端必须再次校验最终路径；
- 不允许选择系统目录、数据库目录、缓存目录、配置目录；
- 如果目标目录已存在且是符号链接，拒绝保存；
- 如果两个源指向同一个 `target_subdir`，保存时提示冲突；
- 删除源时默认只删除配置，不删除已经同步的文件；如果需要删除文件，必须二次确认。

### 9.5 源操作

| 操作 | 说明 |
|---|---|
| 新增 | 填写源信息并测试连接 |
| 编辑 | 修改名称、Token、路径、通道、定时 |
| 启用/禁用 | 不删除配置，只控制是否参与调度 |
| 立即同步 | 手动入队一次 |
| 测试连接 | 检查仓库、Token、速率限制 |
| 查看状态 | 最近版本、最近成功时间、最近错误 |
| 查看历史 | 该源的任务记录 |
| 删除 | 二次确认；默认不删除文件 |

---

## 10. Web 界面

### 10.1 登录页

如果启用了认证：

- 用户名 + 密码；
- 首次启动时生成初始管理员密码，写入 journal：
  ```bash
  journalctl -u uflrs.service | grep -i "initial password"
  ```
- 或者通过 `/etc/uflrs/env` 设置 `ADMIN_INITIAL_PASSWORD`；
- 登录后强制修改初始密码；
- 登录失败限速；
- 会话 Cookie 使用 `HttpOnly`、`SameSite=Strict`；
- 修改类操作需要 CSRF Token。

### 10.2 仪表盘

展示：

- 服务状态：运行中 / 已停止 / 异常；
- 服务启动时间、版本、运行时长；
- 调度器状态：启用 / 暂停；
- 下一次计划执行时间；
- 当前正在执行的任务；
- 各源摘要：
  - 名称；
  - 仓库；
  - 通道；
  - 最近版本；
  - 最近成功时间；
  - 最近状态；
  - 是否启用；
- GitHub 速率限制：
  - 每个 Token 的 remaining / limit / reset；
- 磁盘空间：
  - `ALLOWED_ROOT` 所在分区剩余空间；
- 告警：
  - Token 失效；
  - 路径不可写；
  - 磁盘不足；
  - 最近同步失败。

### 10.3 同步源页面

- 源列表；
- 新增 / 编辑 / 删除；
- 启用 / 禁用；
- 立即同步；
- 取消正在执行的任务；
- 测试连接；
- 查看最近日志；
- 查看历史记录；
- 路径选择器；
- Token 掩码和“更新 Token”；
- 每个源显示下一次计划执行时间。

### 10.4 总设置页面

按第 8 节分组：

- 路径；
- 定时；
- Web 服务；
- GitHub；
- 同步行为；
- 保存 / 取消 / 恢复默认值；
- 修改端口等需要重启的设置时，显示提示；
- 保存前做完整校验，错误定位到具体字段。

### 10.5 历史记录页面

- 按源、状态、时间筛选；
- 显示：
  - 任务 ID；
  - 源；
  - 触发方式；
  - 开始 / 结束时间；
  - 耗时；
  - 版本；
  - 状态；
  - 错误摘要；
- 查看详细日志；
- 下载日志（可选）；
- 失败任务可“重试”。

### 10.6 系统信息页面

- 服务版本；
- 配置文件路径；
- 数据库路径；
- 缓存目录；
- 日志目录；
- `ALLOWED_ROOT` / `global_root`；
- 当前进程 PID；
- 数据库大小；
- 备份 / 恢复入口（可选）；
- 重启服务按钮（需要管理员权限，可选）。

---

## 11. API 设计

建议使用 REST + JSON，前端通过同源请求访问。

### 11.1 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/health` | 健康检查，不需要登录 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 退出 |
| `GET` | `/api/auth/me` | 当前登录用户 |
| `POST` | `/api/auth/change-password` | 修改密码 |

### 11.2 状态和设置

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/status` | 服务、调度器、任务、磁盘、速率限制摘要 |
| `GET` | `/api/settings` | 读取总设置 |
| `PUT` | `/api/settings` | 保存总设置 |
| `POST` | `/api/settings/validate` | 校验设置，不保存 |
| `GET` | `/api/system/info` | 版本、路径、数据库大小等 |

### 11.3 同步源

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/sources` | 源列表 |
| `POST` | `/api/sources` | 新增源 |
| `GET` | `/api/sources/:id` | 源详情 |
| `PUT` | `/api/sources/:id` | 修改源 |
| `DELETE` | `/api/sources/:id` | 删除源（默认不删文件） |
| `POST` | `/api/sources/:id/enable` | 启用 |
| `POST` | `/api/sources/:id/disable` | 禁用 |
| `POST` | `/api/sources/:id/sync` | 立即同步 |
| `POST` | `/api/sources/:id/test` | 测试连接 |
| `GET` | `/api/sources/:id/status` | 该源最近状态 |

### 11.4 任务和历史

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/runs` | 任务列表，支持筛选 |
| `GET` | `/api/runs/:id` | 任务详情 |
| `GET` | `/api/runs/:id/log` | 任务日志 |
| `POST` | `/api/runs/:id/cancel` | 取消任务 |
| `POST` | `/api/runs/:id/retry` | 重试任务 |

### 11.5 文件系统

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/fs/dirs?path=` | 列出 `global_root` 下的子目录 |
| `POST` | `/api/fs/dirs` | 在 `global_root` 下新建子目录 |

要求：

- `path` 只能是 `global_root` 下的相对路径；
- 后端做规范化校验；
- 不允许列出 `ALLOWED_ROOT` 之外的内容；
- 不允许通过符号链接跳出。

### 11.6 实时事件

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/events` | SSE，推送任务进度、状态变化 |

如果不想用 SSE，也可以前端轮询 `/api/status` 和 `/api/runs`。

### 11.7 审计和备份

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/audit` | 审计日志 |
| `POST` | `/api/backup` | 生成备份（可选） |
| `POST` | `/api/restore` | 恢复备份（可选，需管理员） |

### 11.8 通用约定

- 所有修改类请求必须带 CSRF Token；
- 所有 `/api/*`（除 `/api/health` 和登录）必须登录；
- 错误返回统一结构：
  ```json
  {
    "error": {
      "code": "INVALID_PATH",
      "message": "保存路径必须位于全局路径下"
    }
  }
  ```
- 不返回 Token 明文；
- 日志中过滤 `Authorization`、Token、Cookie；
- 请求体大小限制；
- 登录和 API 限速。

---

## 12. 同步流程（每个源）

### 12.1 调度触发

调度器在配置的时间点：

1. 找到所有启用的源；
2. 跳过正在执行的源；
3. 按 `max_concurrent_jobs` 入队；
4. 默认串行执行，避免多个 GitHub 下载抢占带宽；
5. 每个任务记录 `trigger=schedule`。

### 12.2 手动触发

Web 页面点击“立即同步”：

1. 检查该源是否已有任务在队列或执行中；
2. 有则提示，不重复入队；
3. 没有则入队，`trigger=manual`。

### 12.3 查询 GitHub Release

根据源配置：

- 稳定版：查最新正式 Release；
- 预发布：查 Release 列表，筛选 `prerelease: true && draft: false`；
- `both`：分别处理稳定版和预发布；
- 使用该源自己的 Token；
- 获取：
  - `tag_name`；
  - 资产列表；
  - `published_at`；
  - 是否预发布；
  - 速率限制信息。

### 12.4 检查资产是否完整

| 平台 | 安装包 | 签名 |
|---|---|---|
| Windows | `-setup.exe` 或 `.msi` | 对应 `.sig` |
| macOS | `.app.tar.gz` | 对应 `.sig` |
| Linux | `.AppImage` 或 `.AppImage.tar.gz` | 对应 `.sig` |

缺少任何一个平台：

- 本次任务不更新清单；
- 记录为“Release 资产未就绪”；
- 可以在本次任务内按 `retry_delay` 等待重试；
- 不能发布不完整的 `releases.json`。

### 12.5 版本比较

读取该源在数据库中的 `last_version` 和目标目录中的现有清单：

- 远端版本不比本地新：标记为“已是最新”，不下载；
- 远端版本比本地旧：不降级；
- 版本相同但文件缺失：补传；
- 版本相同且文件完整：跳过。

### 12.6 下载

- 下载到 `/var/cache/uflrs/<run-id>/`；
- 下载安装包和 `.sig`；
- 支持超时、重试、断点续传；
- 记录下载字节数和速度；
- 支持取消：用户点击取消后，终止 Worker，清理临时目录。

### 12.7 校验

- 文件大小；
- `.sig` 非空；
- SHA256（如果 GitHub API 提供摘要或清单里有）；
- 可选：校验 Tauri 签名格式；
- 任何校验失败，任务失败，不更新清单。

### 12.8 重新生成清单

**不要直接使用 GitHub Release 里的 `latest.json`。**

原因：当前 `main.yml` 只有 Linux 的 `release_json: true`，Release 里的 `latest.json` 很可能只包含 Linux 平台，不是完整清单。

正确做法：

1. 用下载下来的安装包和 `.sig`，按平台分别生成清单片段；
2. 合并成完整清单；
3. 每个平台的下载地址改写为该源的局域网地址：
   ```text
   ${http_base_url}/${target_subdir}/v<version>/<filename>
   ```
4. 稳定版写 `releases.json`；
5. 预发布写 `releases_beta.json`；
6. 更新说明 `notes`：
   - 优先使用 Release 资产里 `latest.json` 的 `notes`；
   - 否则从 tag 对应的 `latest.md` 读取：
     ```text
     https://raw.githubusercontent.com/<owner>/<repo>/v<version>/latest.md
     ```
   - 使用仓库现有逻辑转换成客户端需要的 JSON 字符串。

可复用脚本：

```text
scripts/latest-json.mjs          # collect / assemble
scripts/build-release-notes.mjs  # latest.md -> notes JSON
```

### 12.9 复制到目标目录

1. 在目标目录下创建临时目录：
   ```text
   ${global_root}/${target_subdir}/.staging-<run-id>/
   ```
2. 复制安装包和 `.sig`；
3. 校验；
4. 重命名为：
   ```text
   ${global_root}/${target_subdir}/v<version>/
   ```
5. 如果已存在，比较哈希：
   - 完整则跳过；
   - 不完整则重新复制。

### 12.10 原子替换清单

1. 写 `${target_subdir}/.releases.json.tmp`；
2. 校验 JSON；
3. 重命名为 `${target_subdir}/releases.json`；
4. 预发布同理替换 `releases_beta.json`。

### 12.11 验证

- 如果 `http_base_url` 可访问，请求清单 URL，确认 200；
- 确认 `version` 是新版本；
- 对安装包 URL 做 HEAD，确认 200 和文件大小；
- 如果服务就在本机，也可以直接检查本地文件。

### 12.12 记录结果

- 更新 `runs` 表；
- 更新 `sources.last_*` 字段；
- 清理临时目录；
- 保留旧版本（除非配置了 `retention_versions`）；
- 失败时保留旧清单，只记录错误。

### 12.13 任务隔离

- 一个源失败不影响其他源；
- 一个任务失败不影响调度器；
- Worker 崩溃只影响当前任务；
- Web 服务保持可用；
- 服务重启时，未完成的任务标记为 `interrupted`，下次重新执行。

---

## 13. 定时调度

### 13.1 默认策略

- 默认每天 **中午 12:00**；
- 总设置里可以配置多个时间，例如：
  ```text
  12:00
  18:00
  ```
- 时区默认 `Asia/Shanghai`；
- 每个源可以单独覆盖时间；
- 修改后立即重新计算下一次执行；
- 页面显示每个源的下一次执行时间。

### 13.2 启动补跑

`catch_up_on_start=true` 时：

- 服务启动后检查每个源的最后成功时间；
- 如果错过了计划时间，且当前没有任务在跑，补跑一次；
- 避免服务重启后一整天不同步；
- 补跑仍然受“资产完整性”和“版本比较”约束。

### 13.3 发布晚于 12:00

- 当天 12:00 已经跑过，下一次自动同步是第二天 12:00；
- 如果希望立即同步，在 Web 页面点击“立即同步”；
- 或者在总设置里增加一个较晚的时间点。

### 13.4 任务重叠

- 同一个源同一时间只允许一个任务；
- 定时触发时如果该源正在执行，跳过本次，记录日志；
- 不同源可以根据 `max_concurrent_jobs` 排队；
- 默认 1，避免带宽和磁盘压力。

### 13.5 服务停止期间

- 服务停止时不会执行任何同步；
- 重新启动后根据 `catch_up_on_start` 决定是否补跑；
- systemd `Restart=on-failure` 会自动拉起异常退出的服务；
- 如果服务器关机，开机后服务启动，再按补跑策略处理。

---

## 14. 安全设计

### 14.1 认证与授权

- 默认启用管理员登录；
- 首次启动生成初始密码，或从环境变量读取；
- 登录后强制修改初始密码；
- 只有管理员可以修改设置、源、路径和 Token；
- 可选只读账号（后续扩展）；
- 会话 Cookie：`HttpOnly`、`SameSite=Strict`；如果使用 HTTPS，加 `Secure`；
- CSRF Token；
- 登录失败限速和锁定；
- 审计日志记录设置变更。

### 14.2 路径安全

- 三层路径约束（见第 5 节）；
- 后端规范化路径（`realpath` / `canonicalize`）；
- 拒绝 `..`、绝对路径、空路径；
- 拒绝符号链接逃逸；
- 保存和任务执行前都重新校验；
- 前端路径选择器只展示允许范围内的目录；
- 删除旧版本时只删除匹配 `v*` 的目录，不能删除 `global_root`；
- 文件名做白名单/黑名单校验，防止路径分隔符和特殊字符。

### 14.3 Token 安全

- Token 加密后存数据库；
- 主密钥放在 `/etc/uflrs/master.key`，权限 600，root 所有；
- systemd 使用 `LoadCredential=master.key:/etc/uflrs/master.key`，服务从 `$CREDENTIALS_DIRECTORY` 读取；
- Web 界面只显示掩码；
- API 不返回 Token 明文；
- 日志过滤 Token、Authorization、Cookie；
- 支持“清除 Token”；
- 备份数据库时必须同时备份主密钥，否则 Token 无法恢复；
- 不要把主密钥提交到 Git。

### 14.4 Web 安全

- 只监听局域网地址，或通过防火墙限制来源网段；
- 不要把 5050 端口暴露到公网；
- 建议前面加 nginx 反向代理并启用 HTTPS；
- 设置 CSP、X-Content-Type-Options、X-Frame-Options；
- 对源名称、备注等字段做 HTML 转义，防止 XSS；
- 请求体大小限制；
- 登录和 API 限速；
- 只允许同源请求；
- 审计日志。

### 14.5 SSRF 防护

- GitHub API 地址默认固定为 `https://api.github.com`；
- 如果允许 GitHub Enterprise，必须配置主机白名单；
- 禁止用户填写任意 URL 作为下载源；
- 下载地址只允许 GitHub Release 资产域名（`github.com`、`objects.githubusercontent.com`）或白名单域名；
- 禁止访问内网地址、localhost、云元数据地址。

### 14.6 命令执行安全

- 不把用户输入拼接进 shell；
- 使用参数数组调用 `curl` / Node API；
- 仓库名做 `owner/repo` 正则校验；
- 版本号、tag、文件名做字符白名单；
- 不执行下载下来的文件，只保存和校验。

### 14.7 运行权限

- 使用专用用户 `uflrs`，不要用 root；
- 只给 `ALLOWED_ROOT` 写权限；
- 数据库、缓存、日志目录由 systemd `StateDirectory` / `CacheDirectory` / `LogsDirectory` 管理；
- 开启 systemd 沙箱；
- 不在 Web 进程里直接 `systemctl` 提权。

### 14.8 网络与暴露面

- 入站只开放 5050（局域网）；
- 出站只允许 HTTPS 到 GitHub / 代理；
- 不开放 SMB 到公网；
- 如果使用 nginx 反向代理，5050 可以只绑定 `127.0.0.1`。

---

## 15. systemd 单元文件

### 15.1 `/etc/systemd/system/uflrs.service`

```ini
[Unit]
Description=uflrs - UFACTORY Studio LAN Release Sync Web Service
Documentation=https://github.com/garmin954/uf-studio-client/blob/main/docs/uflrs.md
Wants=network-online.target
After=network-online.target
StartLimitBurst=5
StartLimitIntervalSec=60s
# 可选：连续失败时告警；没有 alert 服务时删除
OnFailure=uflrs-alert.service

[Service]
Type=simple
User=uflrs
Group=uflrs
EnvironmentFile=/etc/uflrs/env
ExecStart=/usr/local/bin/uflrs serve --config /etc/uflrs/config.yaml
WorkingDirectory=/var/lib/uflrs
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
KillSignal=SIGTERM
UMask=0027

# 主密钥通过 systemd 传入，避免放在可被 Web 进程随意读取的路径
LoadCredential=master.key:/etc/uflrs/master.key

# 状态、缓存、日志目录
StateDirectory=uflrs
CacheDirectory=uflrs
LogsDirectory=uflrs

# 只允许写 ALLOWED_ROOT；global_root 必须在其下
ReadWritePaths=/srv/releases/xarm

# 安全加固
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6 AF_NETLINK

[Install]
WantedBy=multi-user.target
```

说明：

- `Type=simple`：常驻服务，`systemctl status` 显示 `active (running)`；
- `Restart=on-failure`：异常退出自动拉起；
- `ReadWritePaths=/srv/releases/xarm`：系统级允许根目录，必须覆盖 Web 里配置的 `global_root`；
- `LoadCredential`：主密钥只在服务启动时传入，文件中权限 600；
- 如果 `ALLOWED_ROOT` 不是 `/srv/releases/xarm`，请同步修改 `ReadWritePaths`；
- 不要设置 `MemoryDenyWriteExecute=true`，Node.js 的 JIT 需要可执行内存。

### 15.2 不再需要 timer

Web 服务内部有调度器，因此不需要旧的 timer。

如果之前安装过，先按实际 unit 名禁用：

```bash
sudo systemctl disable --now <旧 timer 的 unit 名>
```

### 15.3 可选：nginx 反向代理

如果希望用 80/443 访问 Web 界面，或者启用 HTTPS，可以让 nginx 反代到 5050：

```nginx
location /uflrs/ {
    proxy_pass http://127.0.0.1:5050/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

此时可以把 `web_bind` 改成 `127.0.0.1`，只让 nginx 访问。

---

## 16. 配置文件与环境变量

### 16.1 `/etc/uflrs/config.yaml`

```yaml
server:
  bind: 0.0.0.0
  port: 5050

paths:
  # 系统级允许根目录，必须与 systemd ReadWritePaths 一致
  allowed_root: /srv/releases/xarm
  # Web 总设置里的全局保存路径，必须在 allowed_root 下
  global_root: /srv/releases/xarm
  # 对外 HTTP 基础地址
  http_base_url: http://192.168.1.19/releases/xarm

schedule:
  # 默认每天中午 12:00；支持多个时间
  times:
    - "12:00"
  timezone: Asia/Shanghai
  catch_up_on_start: true
  max_concurrent_jobs: 1

github:
  api_base: https://api.github.com
  timeout_seconds: 30
  retries: 3
  retry_delay_seconds: 5
  proxy: ""

sync:
  verify_sha256: true
  retention_versions: 0
  stable_manifest_name: releases.json
  prerelease_manifest_name: releases_beta.json

logging:
  level: info
```

说明：

- Token 不写在这个文件里，保存在数据库并加密；
- `allowed_root` 必须与 systemd `ReadWritePaths` 一致；
- `global_root` 必须在 `allowed_root` 下；
- Web 界面修改的业务设置会写入数据库，数据库配置优先于 `config.yaml` 中的默认值。

### 16.2 `/etc/uflrs/env`

```bash
# 管理员初始密码；首次启动后强制修改
ADMIN_INITIAL_PASSWORD=change-me

# 会话签名密钥，至少 32 字节随机值
SESSION_SECRET=replace-with-random-string

# 可选：默认 GitHub Token；源没有单独配置时使用
GITHUB_TOKEN=

# 可选：代理
HTTPS_PROXY=
HTTP_PROXY=
NO_PROXY=
```

设置权限：

```bash
sudo chown root:root /etc/uflrs/env
sudo chmod 600 /etc/uflrs/env
```

### 16.3 主密钥

```bash
sudo openssl rand -base64 32 > /etc/uflrs/master.key
sudo chown root:root /etc/uflrs/master.key
sudo chmod 600 /etc/uflrs/master.key
```

注意：

- 主密钥用于加密源 Token；
- 备份数据库时必须同时备份主密钥；
- 不要把主密钥放进 Git、Web 目录或数据库；
- 更换主密钥需要重新加密所有 Token，建议提供迁移命令。

---

## 17. 安装与启用

### 17.1 创建服务用户

```bash
sudo useradd --system --user-group \
  --home-dir /var/lib/uflrs \
  --shell /usr/sbin/nologin \
  uflrs
```

### 17.2 创建允许根目录

```bash
sudo mkdir -p /srv/releases/xarm
sudo chown -R uflrs:uflrs /srv/releases/xarm
```

如果 nginx 以 `www-data` 运行：

```bash
sudo setfacl -R -m u:www-data:rX /srv/releases/xarm
sudo setfacl -R -d -m u:www-data:rX /srv/releases/xarm
```

### 17.3 安装程序

把程序放到：

```text
/usr/local/bin/uflrs
/usr/local/lib/uflrs/
```

创建目录并确保可执行：

```bash
sudo mkdir -p /usr/local/lib/uflrs
sudo chmod 755 /usr/local/bin/uflrs
```

如果复用仓库脚本，把 `latest-json.mjs`、`build-release-notes.mjs` 放到 `/usr/local/lib/uflrs/`，并安装 Node.js 22。

### 17.4 安装配置和密钥

```bash
sudo mkdir -p /etc/uflrs

sudo install -m 644 -o root -g root \
  config.yaml /etc/uflrs/config.yaml

sudo install -m 600 -o root -g root \
  uflrs.env /etc/uflrs/env

sudo openssl rand -base64 32 > /tmp/uflrs-master.key
sudo install -m 600 -o root -g root \
  /tmp/uflrs-master.key /etc/uflrs/master.key
rm -f /tmp/uflrs-master.key
```

### 17.5 安装 systemd 单元

```bash
sudo install -m 644 \
  uflrs.service /etc/systemd/system/uflrs.service

sudo systemctl daemon-reload
```

### 17.6 启动服务

```bash
sudo systemctl enable --now uflrs.service
```

查看状态：

```bash
systemctl status uflrs.service
```

查看日志：

```bash
journalctl -u uflrs.service -n 200 --no-pager
```

### 17.7 获取初始管理员密码

```bash
journalctl -u uflrs.service | grep -i "initial password"
```

或者使用 `/etc/uflrs/env` 里的 `ADMIN_INITIAL_PASSWORD`。

### 17.8 访问 Web 界面

浏览器打开：

```text
http://192.168.1.19:5050
```

首次登录后：

1. 修改管理员密码；
2. 检查总设置中的全局保存路径；
3. 检查定时时间；
4. 添加第一条 GitHub 下拉源；
5. 点击“测试连接”；
6. 点击“立即同步”做一次验证；
7. 检查目标目录和 HTTP 清单。

---

## 18. 日常运维

### 18.1 systemctl 操作

| 操作 | 命令 |
|---|---|
| 启动 | `sudo systemctl start uflrs.service` |
| 停止 | `sudo systemctl stop uflrs.service` |
| 重启 | `sudo systemctl restart uflrs.service` |
| 开机自启 | `sudo systemctl enable uflrs.service` |
| 取消开机自启 | `sudo systemctl disable uflrs.service` |
| 查看状态 | `systemctl status uflrs.service` |
| 查看日志 | `journalctl -u uflrs.service -n 200` |
| 实时日志 | `journalctl -u uflrs.service -f` |
| 修改单元后重载 | `sudo systemctl daemon-reload` |
| 清除失败状态 | `sudo systemctl reset-failed uflrs.service` |

### 18.2 备份

建议备份：

- `/var/lib/uflrs/state.db`
- `/var/lib/uflrs/state.db-wal`
- `/var/lib/uflrs/state.db-shm`
- `/etc/uflrs/config.yaml`
- `/etc/uflrs/env`
- `/etc/uflrs/master.key`

SQLite 在线备份建议使用：

```bash
sqlite3 /var/lib/uflrs/state.db ".backup '/backup/uflrs-$(date +%F).db'"
```

注意：

- 备份文件里包含加密后的 Token；
- 主密钥必须单独安全保存；
- 不要把备份放在可公开访问的 Web 目录。

### 18.3 恢复

1. 停止服务：
   ```bash
   sudo systemctl stop uflrs.service
   ```
2. 恢复数据库、配置、环境变量、主密钥；
3. 检查文件权限；
4. 启动服务：
   ```bash
   sudo systemctl start uflrs.service
   ```
5. 打开 Web 界面确认源和设置都在；
6. 手动触发一次同步验证。

### 18.4 升级程序

1. 备份数据库和配置；
2. 停止服务；
3. 替换 `/usr/local/bin/uflrs` 和 `/usr/local/lib/uflrs/`；
4. 启动服务；
5. 查看日志和 Web 界面；
6. 如果数据库结构有变更，按发布说明执行迁移。

### 18.5 修改端口

1. Web 总设置里修改端口；
2. 保存后提示需要重启；
3. 执行：
   ```bash
   sudo systemctl restart uflrs.service
   ```
4. 检查防火墙规则；
5. 用新地址访问。

### 18.6 修改定时时间

1. Web 总设置里修改 `schedule_times`；
2. 保存后立即生效；
3. 页面确认下一次执行时间；
4. 不需要 `systemctl` 操作。

### 18.7 重置管理员密码

建议提供 CLI：

```bash
sudo uflrs admin reset-password --user admin
```

或者：

1. 停止服务；
2. 从数据库清除管理员密码哈希；
3. 启动服务，重新生成初始密码；
4. 查看 journal。

### 18.8 从旧版 timer 方案迁移

如果之前已经部署过 `timer + oneshot service`：

```bash
sudo systemctl disable --now <旧 timer 的 unit 名>
sudo rm -f /etc/systemd/system/<旧 timer 的 unit 名>
sudo systemctl daemon-reload
```

然后：

1. 安装新的常驻服务；
2. 把旧的 `LAN_RELEASE_ROOT`、`GITHUB_REPO`、`GITHUB_TOKEN` 迁移到总设置和第一个源；
3. 把旧的 `releases.json` 保留在目标目录；
4. 启动新服务；
5. 手动同步一次，确认清单被正确更新。

---

## 19. 失败处理与告警

### 19.1 单个源失败

- 只影响该源；
- 其他源继续按计划执行；
- 不覆盖该源旧的 `releases.json`；
- 在 Web 页面显示红色状态和错误摘要；
- 可以在历史记录里查看详细日志；
- 支持“重试”。

### 19.2 服务失败

- systemd `Restart=on-failure` 自动拉起；
- 连续失败超过 `StartLimitBurst` 后停止尝试；
- 需要 `systemctl reset-failed` 后手动启动；
- Web 页面不可用，但目标目录中的旧清单仍然有效；
- 需要外部监控 `http://192.168.1.19:5050/api/health`。

### 19.3 常见失败原因

| 原因 | 处理 |
|---|---|
| GitHub 不可达 | 检查网络、代理、DNS |
| Token 失效 | 在源配置里更新 Token |
| API 限流 | 配置 Token、降低频率、等待 reset |
| Release 资产未传完 | 等待重试，或下次调度 |
| 目标路径不可写 | 检查权限、磁盘、ACL |
| 磁盘空间不足 | 清理旧版本或扩容 |
| 清单生成失败 | 查看日志，检查 `.sig` 和资产 |
| 路径越界 | 检查 `global_root` / `target_subdir` |
| 数据库损坏 | 从备份恢复 |

### 19.4 告警方式

可以在 Web 页面显示，也可以扩展：

- 企业微信机器人；
- 钉钉机器人；
- 邮件；
- Webhook；
- systemd `OnFailure=` 告警服务。

建议至少告警：

- 连续两次同步失败；
- Token 失效；
- 磁盘剩余空间低于阈值；
- 超过 26 小时没有成功同步；
- 服务异常退出并被 systemd 重启。

### 19.5 内网清单停更的风险

客户端会优先读取内网 `releases.json`。如果同步服务长期不可用：

- 内网客户端可能看不到新版本；
- 必须监控“最后成功同步时间”；
- 如果长期无法恢复，可以临时移除 `releases.json`，让客户端回退到其他更新源；
- 移除前要确认客户端配置中还有 OSS / GitHub 兜底地址。

---

## 20. 验收清单

### 20.1 Web 服务

- [ ] `systemctl status uflrs.service` 显示 `active (running)`；
- [ ] 浏览器能打开 `http://192.168.1.19:5050`；
- [ ] 首次登录能获取初始密码并修改；
- [ ] 未登录访问 API 返回 401；
- [ ] 登录失败多次会限速；
- [ ] 修改设置需要 CSRF Token。

### 20.2 总设置

- [ ] 全局保存路径只能选择 `ALLOWED_ROOT` 下的目录；
- [ ] 定时时间可以设置为每天 12:00；
- [ ] 修改定时时间后，页面下一次执行时间立即更新；
- [ ] 修改端口后提示需要重启；
- [ ] 保存非法路径时，后端拒绝并给出明确错误。

### 20.3 同步源

- [ ] 可以添加两条以上 GitHub 源；
- [ ] 每条源可以配置不同的 Token；
- [ ] Token 保存后只显示掩码；
- [ ] “测试连接”能显示仓库可访问和速率限制；
- [ ] 保存路径选择器只显示 `global_root` 下的目录；
- [ ] 手动输入 `../`、绝对路径、符号链接会被拒绝；
- [ ] 两个源使用相同目标路径时提示冲突；
- [ ] 可以启用/禁用源；
- [ ] 可以立即同步；
- [ ] 可以取消正在执行的任务；
- [ ] 可以查看历史记录和日志；
- [ ] 删除源默认不删除文件。

### 20.4 同步结果

- [ ] 目标目录下生成 `v<version>/`；
- [ ] 安装包和 `.sig` 齐全；
- [ ] `releases.json` 版本正确；
- [ ] 清单里的 URL 是 `http://192.168.1.19/...`，不是 GitHub / OSS；
- [ ] 预发布只更新 `releases_beta.json`；
- [ ] 多个源互不影响；
- [ ] 一个源失败时，其他源仍能成功；
- [ ] 失败时旧清单保持不变。

### 20.5 服务与恢复

- [ ] `systemctl restart` 后配置和源仍然存在；
- [ ] 服务异常退出后 systemd 自动拉起；
- [ ] 服务器重启后服务自动启动；
- [ ] 错过定时时间后，`catch_up_on_start=true` 能补跑；
- [ ] 备份数据库和主密钥后可以恢复；
- [ ] 旧 timer 已禁用，不会重复同步。

### 20.6 安全

- [ ] 5050 端口只允许局域网访问；
- [ ] 公网无法访问 5050；
- [ ] Token 不出现在日志、API 响应、Web 页面源码中；
- [ ] `master.key` 权限为 600，仅 root 可读；
- [ ] 服务以 `uflrs` 用户运行，不是 root；
- [ ] 目标路径之外的目录不可写；
- [ ] 不能通过源配置写入 `global_root` 之外。

---

## 21. 常见问题

### Q1：为什么服务现在一直是 `active (running)`？

因为它是常驻 Web 服务，内部包含 Web UI、API 和调度器。  
同步任务是服务内部的子任务，不再由 systemd timer 触发。

### Q2：还需要 timer 吗？

不需要。  
如果之前安装过，先 `disable --now` 并删除，避免重复同步。

### Q3：定时时间在哪里改？

Web 界面 → 总设置 → 定时时间。  
保存后立即生效，不需要 `systemctl` 操作。

### Q4：12:00 时服务器关机了怎么办？

如果 `catch_up_on_start=true`，服务启动后会补跑一次。  
如果服务根本没启动，则不会同步。

### Q5：发布晚于 12:00，什么时候同步？

默认第二天 12:00。  
需要立即同步就在 Web 页面点击“立即同步”。

### Q6：为什么 `systemctl status` 显示服务正常，但某个源失败？

服务状态和任务状态是分开的。  
某个源失败不会让整个服务退出；到“同步源”或“历史记录”页面看具体错误。

### Q7：Token 怎么保存？

Token 加密后存 SQLite，主密钥在 `/etc/uflrs/master.key`。  
Web 界面只显示掩码，日志和 API 不返回明文。

### Q8：公共仓库需要 Token 吗？

可以不加，但 GitHub API 未登录有速率限制。  
如果同步频率高、源多，建议每个源配置一个只读 Token。

### Q9：多个源可以指向同一个仓库吗？

可以，例如一个同步稳定版，一个同步预发布。  
但不要指向同一个 `target_subdir`；如果确实需要，系统应提示冲突。

### Q10：保存路径为什么不能直接输入绝对路径？

为了安全。  
所有源的保存路径必须是 `global_root` 下的相对子路径，后端会做规范化校验，防止写到系统目录或跳出允许范围。

### Q11：目录名必须是 `studio_client` 吗？

不是，目录名由源配置的 `target_subdir` 决定。  
当前客户端稳定版 endpoint 使用 `studio_client`，所以默认建议使用 `studio_client`。  
如果改成 `client` 或其他名字，必须同时修改客户端 `tauri.conf.json` 和 `tools.rs` 里的稳定版/预发布版 endpoint。  
服务端和客户端的路径必须一致。

### Q12：可以前面加 nginx / HTTPS 吗？

可以。  
把 `web_bind` 改成 `127.0.0.1`，用 nginx 反代到 `127.0.0.1:5050`，并配置证书。

### Q13：端口 5050 安全吗？

只在局域网开放，并启用登录认证和防火墙限制，风险可控。  
不要映射到公网。

### Q14：可以删除旧版本安装包吗？

可以配置 `retention_versions`，只清理匹配 `v*` 的旧版本目录。  
默认不自动删除；删除前建议二次确认。

### Q15：服务重启时正在同步怎么办？

当前任务会被标记为 `interrupted`，临时目录清理；下一次调度或手动触发时重新执行。

### Q16：数据库坏了怎么办？

从备份恢复 `state.db` 和 `master.key`。  
恢复前停止服务，恢复后检查权限并启动。

---

## 22. 附录：默认值速查

| 配置 | 默认值 |
|---|---|
| Web 监听 | `0.0.0.0:5050` |
| 全局保存路径 | `/srv/releases/xarm` |
| 允许根目录 | `/srv/releases/xarm` |
| 默认保存子路径 | `studio_client` |
| 定时时间 | 每天 `12:00` |
| 时区 | `Asia/Shanghai` |
| 启动补跑 | 开启 |
| 最大并发任务 | 1 |
| 稳定清单文件名 | `releases.json` |
| 预发布清单文件名 | `releases_beta.json` |
| 保留版本数 | 0（不自动清理） |
| 日志级别 | `info` |
| 认证 | 开启 |
| 服务用户 | `uflrs` |

---

## 23. 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v3 | 2026-11-18 | 服务名称统一为 `uflrs`：`uflrs.service`、`uflrs` 命令、`/etc/uflrs/`、`/var/lib/uflrs/` 等 |
| v2 | 2026-11-18 | 改为常驻 Web 服务；增加多 GitHub 源、Token、路径约束、总设置、状态控制、历史记录 |
| v1 | 2026-11-18 | 初版：timer + oneshot 每天 12:00 同步 |
