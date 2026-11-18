# build
```
pnpm version

pnpm tauri build

pnpm release
```

# 发布流程

推 `v*` tag（或手动触发 `Studio Client Tauri Release`）后，`.github/workflows/main.yml` 会：

1. `prepare-release`：读取 `release.md` / `latest.md`，创建或更新 GitHub Release；
2. `build`：三个平台（Linux / macOS / Windows）并行打包，各自生成一份 updater 清单片段；
3. `publish-oss`：调用可复用工作流 `.github/workflows/publish-oss.yml`，合并清单生成 `latest.json`，连同安装包一起上传到阿里云 OSS。

GitHub Release 的原有流程（`tauri-action` 上传安装包、`latest.json`）保持不变。

工作流文件划分：

| 文件 | 作用 |
| --- | --- |
| `.github/workflows/main.yml` | 主流程：构建 + GitHub Release，并通过 `uses:` 调用 OSS 发布 |
| `.github/workflows/publish-oss.yml` | 可复用工作流（`workflow_call`）：只做 OSS 上传，可单独重跑 |

## OSS 上传

需要在仓库 `Settings > Secrets and variables > Actions` 中配置：

| 名称 | 说明 |
| --- | --- |
| `OSS_ACCESS_KEY_ID` | RAM 用户 AccessKey ID（只需该 Bucket 的 `PutObject` 权限） |
| `OSS_ACCESS_KEY_SECRET` | 对应 AccessKey Secret |
| `OSS_ENDPOINT` | 如 `oss-cn-shenzhen.aliyuncs.com`（不要带 `https://`） |
| `OSS_BUCKET` | Bucket 名称 |

可选仓库变量：

| 名称 | 默认值 | 说明 |
| --- | --- | --- |
| `OSS_PUBLIC_BASE_URL` | `https://update.ufactory.cc` | 客户端访问安装包所用的域名 |
| `OSS_ACL` | 不设置 | 需要对象公共读时设为 `public-read`（Bucket 已开启「阻止公共访问」时不要设置） |

对象布局（与客户端更新源 `https://update.ufactory.cc/releases/studio_client/latest.json` 对应）：

```
releases/studio_client/latest.json                  # 更新清单，Cache-Control: no-cache
releases/studio_client/v1.0.13/<安装包及 .sig>       # 版本目录，长缓存
```

预发布（prerelease）版本会写到 `latest-pre.json`，不会覆盖正式清单。

## 本地手动发布

```bash
# 生成清单片段（在对应平台的打包机上执行）
node scripts/latest-json.mjs collect --bundle src-tauri/target/release/bundle \
  --platform windows-x86_64 --out updater-manifest.json

# 合并为 latest.json
LATEST_NOTES='{"force_update":false,"description":{"cn":"","en":""},"content":{"cn":"","en":""}}' \
  node scripts/latest-json.mjs assemble --manifests <片段所在目录> \
  --version 1.0.13 --base-url https://update.ufactory.cc/releases/studio_client/v1.0.13 \
  --out oss-stage/latest.json

# 上传到 OSS（需先 npm install --prefix .oss-tools ali-oss@6）
OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... OSS_ENDPOINT=oss-cn-shenzhen.aliyuncs.com \
  OSS_BUCKET=... VERSION=1.0.13 node scripts/publish-oss.mjs
```
