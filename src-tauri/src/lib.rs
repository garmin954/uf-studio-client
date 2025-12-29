mod commands;
mod packages;
mod state;
mod utils;
use tauri::{LogicalSize, Manager};
mod desktops;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = state::app_state::AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::system::app_exit,
            commands::system::open_studio_window,
            commands::system::start_udp_broadcast,
            commands::system::stop_udp_broadcast,
            commands::system::ping,
            commands::request::fetch_history_releases,
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
            // let handle = app.handle();
            let window = app.get_webview_window("main").unwrap();
            // 设置标准尺寸
            window.set_size(LogicalSize::new(1280.0, 768.0)).unwrap();
            // window.reload().unwrap();

            // 获取version版本
            let version = env!("CARGO_PKG_VERSION");
            log::info!(
                "{} {}",
                packages::menu::i18n::tr("软件版本:", "Software version:"),
                version
            );

            #[cfg(desktop)]
            {
                // desktops::tray::setup_tray(handle)?;
                // desktops::window::setup_desktop_window(handle)?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("run fail");
}
