use crate::packages::menu::i18n;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub fn setup_desktop_window(app: &AppHandle) -> Result<(), String> {
    // 主窗口配置
    let mut main_builder =
        WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/app/home".into()))
            .title("UFACTORY Studio")
            // .transparent(false)
            // .background_color(Color::from([255, 255, 255]))
            // .resizable(true)
            // .center()
            // .shadow(true)
            // .decorations(true)
            .inner_size(1280.0, 768.0);

    // Windows 和 Linux 平台特定配置
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        main_builder = main_builder.transparent(true);
    }

    // macOS 平台特定配置
    #[cfg(target_os = "macos")]
    {
        use tauri::utils::TitleBarStyle;
        main_builder = main_builder.title_bar_style(TitleBarStyle::Transparent);
    }

    // 构建启动页和主窗口
    let main_window = main_builder.build().map_err(|e| e.to_string())?;

    // 监听窗口事件
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    main_window
        .clone()
        .on_window_event(move |event| match event {
            WindowEvent::CloseRequested { .. } => {
                log::info!(
                    "{}",
                    i18n::tr(
                        "关闭请求，应用将退出。",
                        "Close requested, application will exit."
                    )
                );
            }
            _ => {}
        });

    // 仅在构建 macOS 时设置背景颜色
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};

        let ns_window = main_window.clone().ns_window().unwrap() as id;
        unsafe {
            let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                nil,
                50.0 / 255.0,
                158.0 / 255.0,
                163.5 / 255.0,
                1.0,
            );
            ns_window.setBackgroundColor_(bg_color);
        }
    }
    Ok(())
}

#[allow(dead_code)]
#[cfg(desktop)]
pub fn show_window(app: &AppHandle) {
    if let Some(window) = app.webview_windows().get("main") {
        window.unminimize().unwrap_or_else(|e| {
            eprintln!(
                "{}: {:?}",
                i18n::tr("取消最小化窗口时出错", "Error while unminimizing window"),
                e
            )
        });
        window.show().unwrap_or_else(|e| {
            eprintln!(
                "{}: {:?}",
                i18n::tr("显示窗口时出错", "Error while showing window"),
                e
            )
        });
        window.set_focus().unwrap_or_else(|e| {
            eprintln!(
                "{}: {:?}",
                i18n::tr("聚焦窗口时出错", "Error while focusing window"),
                e
            )
        });
    } else {
        eprintln!("{}", i18n::tr("未找到窗口", "Window not found"));
        // 创建窗口
        setup_desktop_window(app).unwrap_or_else(|e| {
            eprintln!(
                "{}: {:?}",
                i18n::tr("创建窗口时出错", "Error while creating window"),
                e
            )
        });
    }
}
