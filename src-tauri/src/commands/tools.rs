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

#[tauri::command]
pub async fn set_beta_updater<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    webview: Webview<R>,
) -> Response<serde_json::Value> {
    info!(
        "{}",
        i18n::tr("开始检查测试版更新", "Checking beta updates")
    );

    let update_url =
        match tauri::Url::parse("http://192.168.1.19/releases/xarm/xarm_tool/releases_beta.json") {
            Ok(url) => url,
            Err(e) => {
                return Response::error(format!(
                    "{}: {}",
                    i18n::tr("解析更新URL失败", "Failed to parse update URL"),
                    e
                ))
            }
        };

    set_updater_url(app, webview, update_url).await
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

    let update_url = match tauri::Url::parse(
        "https://github.com/garmin954/uf-studio-client/releases/latest/download/latest.json",
    ) {
        Ok(url) => url,
        Err(e) => {
            return Response::error(format!(
                "{}: {}",
                i18n::tr("解析更新URL失败", "Failed to parse update URL"),
                e
            ))
        }
    };

    set_updater_url(app, webview, update_url).await
}

async fn set_updater_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    webview: Webview<R>,
    update_url: tauri::Url,
) -> Response<serde_json::Value> {
    if let Ok(ub) = app.updater_builder().endpoints(vec![update_url]) {
        info!(
            "{}",
            i18n::tr("测试版更新器初始化成功", "Updater initialized successfully")
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

        // 检查更新
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

                    // let update_info = serde_json::json!({
                    //     "version": update_data.version,
                    //     "current_version": update_data.current_version,
                    //     "body": update_data.body,
                    //     "date": update_data.date,
                    //     "rid": rid,
                    // });
                    Response::success(serde_json::to_value(metadata).unwrap_or_else(|e| {
                        error!(
                            "{}: {}",
                            i18n::tr("序列化 Metadata 失败", "Failed to serialize metadata"),
                            e
                        );
                        json!({})
                    }))
                    // Response::success(metadata)
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
