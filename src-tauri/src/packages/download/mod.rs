use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use tauri::{webview::DownloadEvent, Emitter, Manager, Webview};
use tauri_plugin_dialog::DialogExt;

/// 已完成下载、等待用户选择保存位置的文件
struct Pending {
    name: String,
    temp_path: PathBuf,
}

type PendingMap = Arc<Mutex<HashMap<String, Pending>>>;

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

/// 在目录下生成不重复的文件路径（重名时追加 " (n)"）
fn unique_path(dir: &Path, file_name: &str) -> PathBuf {
    let mut path = dir.join(file_name);
    let mut counter = 1;
    while path.exists() {
        let new_name = match file_name.rsplit_once('.') {
            Some((base, ext)) => format!("{base} ({counter}).{ext}"),
            None => format!("{file_name} ({counter})"),
        };
        path = dir.join(new_name);
        counter += 1;
    }
    path
}

/// 移动文件，跨盘失败时退化为 复制+删除
fn move_file(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::rename(from, to).or_else(|_| -> std::io::Result<()> {
        std::fs::copy(from, to)?;
        std::fs::remove_file(from)
    })
}

/// webview 下载回调。
///
/// 流程：下载请求 → 暂存到临时目录并立即放行 → 下载完成后弹出系统保存框 →
/// 用户选定目录后把临时文件移动过去。
///
/// 注意：不能在 `Requested` 回调里同步弹框（`blocking_save_file`），
/// 该回调运行在 webview 事件线程上，绑定父窗口后会与主窗口消息循环死锁。
pub fn handler<R: tauri::Runtime>(
) -> impl Fn(Webview<R>, DownloadEvent<'_>) -> bool + Send + Sync + 'static {
    let pending: PendingMap = Arc::new(Mutex::new(HashMap::new()));

    move |webview, event| {
        match event {
            DownloadEvent::Requested { url, destination } => {
                // 文件名优先级：内核建议名（含 a[download] 属性 / Content-Disposition）
                // > URL 路径推断 > 时间戳兜底
                let file_name = destination
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .filter(|n| !n.is_empty())
                    .or_else(|| filename_from_url(&url))
                    .unwrap_or_else(|| {
                        format!("download_{}", chrono::Local::now().format("%Y%m%d%H%M%S"))
                    });
                log::info!("download requested: {} ({})", url, file_name);

                let dir = std::env::temp_dir().join("uf-studio-downloads");
                if let Err(e) = std::fs::create_dir_all(&dir) {
                    log::error!("create temp download dir failed: {}", e);
                    return false;
                }
                let temp_path = unique_path(&dir, &file_name);
                pending.lock().unwrap().insert(
                    url.to_string(),
                    Pending {
                        name: file_name,
                        temp_path: temp_path.clone(),
                    },
                );
                *destination = temp_path;
                true
            }
            DownloadEvent::Finished {
                url,
                path,
                success,
            } => {
                log::info!(
                    "download finished: {} success={} path={:?}",
                    url,
                    success,
                    path
                );
                let record = pending.lock().unwrap().remove(url.as_str());
                match record {
                    Some(p) if success => {
                        // 下载完成后再弹系统保存框（此处不在 DownloadStarting
                        // 回调内，set_parent + 异步对话框不会死锁）
                        let window = webview.window();
                        let app = webview.app_handle().clone();

                        // 应用在后台时，Windows 不允许后台窗口抢占前台，
                        // 对话框会被其它软件窗口盖住。
                        // 临时把主窗口置顶，让属主对话框跟随浮到最上层，关框后恢复。
                        let _ = window.unminimize();
                        let _ = window.show();
                        let restore_on_top = !window.is_always_on_top().unwrap_or(false);
                        if restore_on_top {
                            let _ = window.set_always_on_top(true);
                        }
                        let _ = window.set_focus();

                        let restore_window = window.clone();
                        webview
                            .dialog()
                            .file()
                            .set_parent(&window)
                            .set_file_name(&p.name)
                            .save_file(move |dest| {
                                if restore_on_top {
                                    let _ = restore_window.set_always_on_top(false);
                                }
                                match dest.and_then(|f| f.into_path().ok()) {
                                    Some(dest_path) => {
                                        match move_file(&p.temp_path, &dest_path) {
                                            Ok(_) => {
                                                log::info!("saved to {}", dest_path.display());
                                                let _ = app.emit(
                                                    "download-saved",
                                                    serde_json::json!({
                                                        "name": p.name,
                                                        "path": dest_path,
                                                    }),
                                                );
                                            }
                                            Err(e) => {
                                                log::error!(
                                                    "move download failed: {}",
                                                    e
                                                );
                                                let _ = std::fs::remove_file(&p.temp_path);
                                            }
                                        }
                                    }
                                    // 用户取消，清理临时文件
                                    None => {
                                        let _ = std::fs::remove_file(&p.temp_path);
                                        log::info!("download save cancelled: {}", p.name);
                                    }
                                }
                            });
                    }
                    Some(p) => {
                        // 下载失败，清理临时文件
                        let _ = std::fs::remove_file(&p.temp_path);
                        log::warn!("download failed: {}", url);
                    }
                    None => {
                        log::warn!("no pending record for download: {}", url);
                    }
                }
                true
            }
            _ => true,
        }
    }
}
