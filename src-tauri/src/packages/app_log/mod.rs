use std::path::PathBuf;

use chrono::Local;
use tauri::{
    plugin::{Builder as PluginBuilder, TauriPlugin},
    Manager, Runtime,
};
use tauri_plugin_log::{
    attach_logger, Builder as LogBuilder, Target, TargetKind, TimezoneStrategy,
};

/// app_log 是对 `tauri_plugin_log` 的封装。
/// 在这里可以拿到 `app`，用来计算日志目录等。
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    PluginBuilder::new("app_log")
        .setup(|app, _api| {
            let log_file_name = Local::now().format("%Y_%m_%d").to_string();
            // 基于应用资源目录的日志目录：{resource_dir}/log/rs
            let log_folder = app
                .path()
                .resource_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("log/rs");

            let app_handle = app.app_handle();

            // 用 tauri_plugin_log 构建真正的 logger，并挂到全局 log 上
            let (_log_plugin, max_level, logger) = LogBuilder::new()
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .format(|out, message, record| {
                    let now = Local::now();
                    let date = now.format("%Y-%m-%d");
                    let time = now.format("%H:%M:%S");
                    let target = record.target();

                    if target.starts_with("tool_service_stdout") {
                        out.finish(format_args!("[{}][{}][🥑python] {}", date, time, message));
                    } else if target.starts_with("webview") {
                        out.finish(format_args!(
                            "[{}][{}][✨frontend][{}] {}",
                            date,
                            time,
                            record.level(),
                            message
                        ));
                    } else {
                        out.finish(format_args!(
                            "[{}][{}][{}][{}] {}",
                            date,
                            time,
                            record.level(),
                            target,
                            message
                        ));
                    }
                })
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::Folder {
                        path: log_folder,
                        file_name: Some(log_file_name),
                    }),
                ])
                .split(&app_handle)?;

            attach_logger(max_level, logger)?;

            Ok(())
        })
        .build()
}
