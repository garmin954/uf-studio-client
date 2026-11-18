/**
 * 使用 ali-oss 把 staging 目录中的安装包和 latest.json 上传到阿里云 OSS。
 *
 * 需要环境变量：
 *   OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
 *   OSS_ENDPOINT   例如 oss-cn-shenzhen.aliyuncs.com（不带 https://）
 *   OSS_BUCKET     例如 ufactory-release
 *   OSS_PREFIX     对象前缀，例如 releases/studio_client
 *   VERSION        版本号（不带 v）
 * 可选：
 *   OSS_REGION     默认从 endpoint 推导
 *   OSS_STAGE_DIR  默认 oss-stage
 *   OSS_ACL        默认不设置（沿用 Bucket ACL）；需要对象公共读时设为 public-read
 *   IS_PRERELEASE  为 true 时清单写到 latest-pre.json，避免覆盖生产清单
 *
 * 产物布局：
 *   <prefix>/v<version>/<installer>      缓存一年（版本目录内容不可变）
 *   <prefix>/latest.json                 不缓存（保证更新检查拿到最新清单）
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const CONTENT_TYPES = new Map([
  [".json", "application/json; charset=utf-8"],
  [".sig", "text/plain; charset=utf-8"],
  [".msi", "application/octet-stream"],
  [".exe", "application/octet-stream"],
  [".dmg", "application/octet-stream"],
  [".deb", "application/octet-stream"],
  [".appimage", "application/octet-stream"],
  [".gz", "application/gzip"],
]);

function contentTypeOf(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith(".appimage.tar.gz")) return "application/gzip";
  return CONTENT_TYPES.get(path.extname(lower)) ?? "application/octet-stream";
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

/**
 * 从 endpoint 推导 region。支持：
 *   oss-cn-shenzhen.aliyuncs.com
 *   oss-cn-shenzhen-internal.aliyuncs.com
 *   https://oss-cn-shenzhen.aliyuncs.com
 *   oss-cn-shenzhen.aliyuncs.com/whatever
 * 自定义域名（CNAME 到 OSS）无法推导，需要显式设置 OSS_REGION。
 */
function resolveRegion(endpoint) {
  if (process.env.OSS_REGION) return process.env.OSS_REGION;
  const match = /(?:^|\.)oss-([a-z0-9-]+?)(?:-internal)?\.aliyuncs\.com/i.exec(endpoint);
  if (!match) {
    throw new Error(
      `无法从 OSS_ENDPOINT=${endpoint} 推导 region。` +
        "请在仓库 Variables 里设置 OSS_REGION（例如 oss-cn-shenzhen），" +
        "或把 OSS_ENDPOINT 设为 oss-<region>.aliyuncs.com 形式。",
    );
  }
  return `oss-${match[1]}`;
}

async function uploadFile(client, bucket, file, objectKey, cacheControl, acl) {
  const headers = {
    "Content-Type": contentTypeOf(file),
    "Cache-Control": cacheControl,
  };
  // Bucket 若已开启「阻止公共访问」，设置对象 ACL 会直接报错，因此仅在显式配置时才设置
  if (acl) headers["x-oss-object-acl"] = acl;

  const result = await client.put(objectKey, file, { headers });
  console.log(`  ${path.basename(file)} -> oss://${bucket}/${objectKey} (${result.res.status})`);
}

async function main() {
  // ali-oss 由 workflow 安装到独立目录（npm install --prefix .oss-tools ali-oss），
  // 不放进项目依赖，避免影响客户端打包
  const toolDir = process.env.OSS_TOOL_DIR ?? ".oss-tools";
  const require = createRequire(path.resolve(toolDir, "index.js"));
  const OSS = require("ali-oss");

  // Secret 里粘贴的值常带尾随空白或末尾斜杠，先清理再做 region 推导
  const endpoint = requireEnv("OSS_ENDPOINT")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  const bucket = requireEnv("OSS_BUCKET");
  const prefix = (process.env.OSS_PREFIX ?? "releases/studio_client").replace(
    /^\/+|\/+$/g,
    "",
  );
  const version = requireEnv("VERSION").replace(/^v/i, "");
  const stageDir = path.resolve(process.env.OSS_STAGE_DIR ?? "oss-stage");
  const acl = process.env.OSS_ACL?.trim() || "";
  // 预发布版本不能覆盖生产清单，否则正式用户会被推送测试包
  const isPrerelease = /^(true|1|yes)$/i.test(process.env.IS_PRERELEASE ?? "");
  const manifestKey = `${prefix}/${isPrerelease ? "latest-pre.json" : "latest.json"}`;

  const client = new OSS({
    region: resolveRegion(endpoint),
    endpoint,
    accessKeyId: requireEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: requireEnv("OSS_ACCESS_KEY_SECRET"),
    bucket,
    secure: true,
  });

  const versionDir = path.join(stageDir, `v${version}`);
  const entries = await fs.readdir(versionDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    // 只上传安装包本体和签名，latest.json 单独处理
    .filter((entry) => !entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(versionDir, entry.name));

  if (files.length === 0) {
    throw new Error(`目录为空，没有可上传的文件: ${versionDir}`);
  }

  console.log(`上传安装包到 oss://${bucket}/${prefix}/v${version}/`);
  for (const file of files) {
    const objectKey = `${prefix}/v${version}/${path.basename(file)}`;
    await uploadFile(
      client,
      bucket,
      file,
      objectKey,
      // 版本目录内容不会变化，允许长期缓存
      "public, max-age=31536000, immutable",
      acl,
    );
  }

  const manifest = path.join(stageDir, "latest.json");
  console.log(`上传更新清单到 oss://${bucket}/${manifestKey}`);
  await uploadFile(client, bucket, manifest, manifestKey, "no-cache, no-store", acl);

  console.log("OSS 发布完成");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
