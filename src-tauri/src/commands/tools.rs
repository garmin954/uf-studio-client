use log::{error, info};
use serde::Serialize;
use serde_json::json;
use tauri::Manager;
use tauri::{ResourceId, Webview};
use tauri_plugin_updater::UpdaterExt;

use crate::packages::menu::i18n;
use crate::utils::response::Response;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Metadata {
    rid: Option<ResourceId>,
    available: bool,
    current_version: String,
    version: String,
    date: Option<String>,
    body: Option<String>,
}

/// 依次解析多个更新源地址，任一解析失败即返回错误
fn parse_endpoints(urls: &[&str]) -> Result<Vec<tauri::Url>, Response<serde_json::Value>> {
    let mut endpoints = Vec::with_capacity(urls.len());
    for url in urls {
        match tauri::Url::parse(url) {
            Ok(u) => endpoints.push(u),
            Err(e) => {
                return Err(Response::error(format!(
                    "{}: {}",
                    i18n::tr("解析更新URL失败", "Failed to parse update URL"),
                    e
                )))
            }
        }
    }
    Ok(endpoints)
}

#[tauri::command]
pub async fn set_beta_updater<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    webview: Webview<R>,
) -> Response<serde_json::Value> {
    info!(
        "{}",
        i18n::tr("开始检查测试版更新", "Checking beta updates")
    );

    // 测试版更新源：仅内网
    let endpoints =
        match parse_endpoints(&["http://192.168.1.19/releases/xarm/studio_client/releases_beta.json"]) {
            Ok(e) => e,
            Err(resp) => return resp,
        };

    set_updater_url(app, webview, endpoints).await
}

#[tauri::command]
pub async fn set_stable_updater<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    webview: Webview<R>,
) -> Response<serde_json::Value> {
    info!(
        "{}",
        i18n::tr("开始检查生产版更新", "Checking stable updates")
    );

    // 生产版更新源：内网优先，OSS 兜底，GitHub 最后（外网/远程机器连不上内网时回退）
    let endpoints = match parse_endpoints(&[
        "http://192.168.1.19/releases/xarm/studio_client/releases.json",
        "https://update.ufactory.cc/releases/studio_client/latest.json",
        "https://github.com/garmin954/uf-studio-client/releases/latest/download/latest.json",
    ]) {
        Ok(e) => e,
        Err(resp) => return resp,
    };

    set_updater_url(app, webview, endpoints).await
}

async fn set_updater_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    webview: Webview<R>,
    endpoints: Vec<tauri::Url>,
) -> Response<serde_json::Value> {
    // 外网机器会先尝试内网地址，设置连接超时上限避免长时间卡住
    const CHECK_TIMEOUT_MS: u64 = 10_000;

    if let Ok(ub) = app
        .updater_builder()
        .timeout(std::time::Duration::from_millis(CHECK_TIMEOUT_MS))
        .endpoints(endpoints)
    {
        info!(
            "{}",
            i18n::tr("更新器初始化成功", "Updater initialized successfully")
        );
        // 构建更新检查器
        let updater = match ub.build() {
            Ok(u) => u,
            Err(e) => {
                return Response::error(format!(
                    "{}: {}",
                    i18n::tr("无法初始化更新器", "Failed to initialize updater"),
                    e
                ))
            }
        };

        // 检查更新（updater 会按顺序尝试各更新源，直到有一个成功）
        match updater.check().await {
            Ok(update) => {
                let mut metadata = Metadata::default();
                if let Some(update_data) = update {
                    info!(
                        "{} {}",
                        i18n::tr("发现新版本:", "Found new version:"),
                        update_data.version
                    );
                    metadata.available = true;
                    metadata
                        .current_version
                        .clone_from(&update_data.current_version);
                    metadata.version.clone_from(&update_data.version);
                    metadata.date = update_data.date.map(|d| d.to_string());
                    metadata.body.clone_from(&update_data.body);
                    metadata.rid = Some(webview.resources_table().add(update_data));

                    Response::success(serde_json::to_value(metadata).unwrap_or_else(|e| {
                        error!(
                            "{}: {}",
                            i18n::tr("序列化 Metadata 失败", "Failed to serialize metadata"),
                            e
                        );
                        json!({})
                    }))
                } else {
                    info!("{}", i18n::tr("当前已是最新版本", "Already up to date"));
                    Response::success(serde_json::json!({
                        "is_latest": true
                    }))
                }
            }
            Err(e) => {
                error!(
                    "{}: {}",
                    i18n::tr("检查更新失败", "Check for updates failed"),
                    e
                );
                Response::error(format!(
                    "{}: {}",
                    i18n::tr("检查更新失败", "Check for updates failed"),
                    e
                ))
            }
        }
    } else {
        Response::error(i18n::tr("无法初始化更新器", "Failed to initialize updater").to_string())
    }
}
