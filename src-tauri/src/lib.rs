mod commands;
mod packages;
mod state;
mod utils;
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = state::app_state::AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::system::app_exit,
            commands::system::start_udp_broadcast,
            commands::system::stop_udp_broadcast,
            commands::system::ping,
            commands::request::fetch_history_releases,
            commands::http::fetch_with_timeout,
            commands::tools::set_beta_updater,
            commands::tools::set_stable_updater,
            commands::system::open_devtools,
        ])
        // .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().skip_logger().build())
        // .menu(packages::menu::mount)
        // .on_menu_event(|app, event| packages::menu::event_handler(app, &event))
        .plugin(packages::app_log::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .plugin(packages::keyboard::init())
        .plugin(packages::menu::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // 主窗口改为代码创建，以便挂载 on_download 下载回调
            // （配置项与 tauri.conf.json 中原 windows 声明保持一致）
            let _window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/app/home".into()))
                .title("UFACTORY Studio")
                .inner_size(1280.0, 768.0)
                .min_inner_size(1080.0, 648.0)
                .visible(false)
                .additional_browser_args(
                    "--enable-energy-saver --enable-gpu --ignore-gpu-blacklist",
                )
                .on_download(packages::download::handler())
                .build()?;

            // 获取version版本
            let version = env!("CARGO_PKG_VERSION");
            log::info!(
                "{} {}",
                packages::menu::i18n::tr("软件版本:", "Software version:"),
                version
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("run fail");
}
