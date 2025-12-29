use crate::packages::menu::i18n;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::{thread, time::Duration};
use tauri::{path::BaseDirectory, AppHandle, Manager};

/// 监控配置结构体
#[derive(Clone)]
pub struct MonitorConfig {
    #[allow(dead_code)]
    pub process_name: String,
    pub interval: Duration,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            process_name: "tool_service".to_string(),
            interval: Duration::from_secs(3),
        }
    }
}

/// 启动状态监控线程
///
/// # 参数
/// * `app_handle` - Tauri 应用句柄
/// * `config` - 监控配置
///
/// # 返回
/// * `Arc<AtomicBool>` - 停止信号，可用于优雅地停止监控线程
///
/// # 示例
/// ```
/// let stop_signal = spawn_state_monitor(&app_handle, MonitorConfig::default());
/// // 停止监控
/// stop_signal.store(false, Ordering::Relaxed);
/// ```
pub fn spawn_state_monitor(app_handle: &AppHandle, config: MonitorConfig) -> Arc<AtomicBool> {
    let app_handle = app_handle.clone();
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    thread::spawn(move || {
        while running_clone.load(Ordering::Relaxed) {
            let config_path = resolve_config_path(&app_handle);
            // 预计算配置存在状态（假设不常变化）
            let _ = config_path.as_ref().map(|p| p.exists()).unwrap_or(false);

            thread::sleep(config.interval);
        }

        log::info!(
            "{}",
            i18n::tr("状态监控线程已停止", "State monitor thread stopped")
        );
    });

    running
}

/// 解析配置文件路径
fn resolve_config_path(
    app_handle: &AppHandle,
) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let config_path = app_handle
        .path()
        .resolve("releases/uf_product_config.ini", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    Ok(config_path)
}

/// 向后兼容的旧函数（已废弃，建议使用 spawn_state_monitor）
#[allow(dead_code)]
#[deprecated(since = "0.1.0", note = "请使用 spawn_state_monitor 代替")]
pub fn get_state_data(rx: &AppHandle) {
    spawn_state_monitor(rx, MonitorConfig::default());
}
