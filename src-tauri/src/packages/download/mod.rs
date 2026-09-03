use tauri::{webview::DownloadEvent, Emitter, Webview};
use tauri_plugin_dialog::DialogExt;

/// 从下载 URL 推断文件名（blob: 等无路径 URL 返回 None）
fn filename_from_url(url: &tauri::Url) -> Option<String> {
    url.path_segments()
        .and_then(|segs| segs.filter(|s| !s.is_empty()).next_back())
        .and_then(|name| {
            percent_encoding::percent_decode_str(name)
                .decode_utf8()
                .ok()
                .map(|s| s.into_owned())
        })
}

/// webview 下载回调：
/// 收到下载请求时弹出系统保存对话框，用户选定路径后由内核直接下载到该位置；
/// 用户取消对话框则中止下载。
pub fn on_download<R: tauri::Runtime>(webview: Webview<R>, event: DownloadEvent<'_>) -> bool {
    match event {
        DownloadEvent::Requested { url, destination } => {
            // 文件名优先级：
            // 1. destination 内核建议名（WebView2/WKWebView/WebKitGTK 会带上
            //    a[download] 属性或 Content-Disposition 的文件名，blob 下载也准确）
            // 2. 从 URL 路径推断
            // 3. 时间戳兜底
            let file_name = destination
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .filter(|n| !n.is_empty())
                .or_else(|| filename_from_url(&url))
                .unwrap_or_else(|| {
                    format!("download_{}", chrono::Local::now().format("%Y%m%d%H%M%S"))
                });
            log::info!("download requested: {} ({})", url, file_name);

            match webview
                .dialog()
                .file()
                .set_file_name(&file_name)
                .blocking_save_file()
                .and_then(|f| f.into_path().ok())
            {
                Some(path) => {
                    *destination = path;
                    true
                }
                // 用户取消保存框，中止下载
                None => {
                    log::info!("download cancelled: {}", url);
                    false
                }
            }
        }
        DownloadEvent::Finished { url, path, success } => {
            log::info!(
                "download finished: {} success={} path={:?}",
                url,
                success,
                path
            );
            let _ = webview.emit(
                "download-finished",
                serde_json::json!({
                    "url": url.as_str(),
                    "path": path,
                    "success": success,
                }),
            );
            true
        }
        _ => true,
    }
}
