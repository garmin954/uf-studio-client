use std::{collections::HashMap, path::PathBuf};

use tauri::{
    plugin::{Builder as PluginBuilder, TauriPlugin},
    AppHandle, LogicalSize, Runtime, WindowEvent,
};
use tauri::{Manager, RunEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// 初始化键盘
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    PluginBuilder::new("app_keyboard")
        .on_event(move |app, event| match event {
            RunEvent::WindowEvent { event, .. } => match event {
                WindowEvent::Focused(false) => {
                    let shortcut_manager = app.global_shortcut();
                    if let Err(e) = shortcut_manager.unregister_all() {
                        eprintln!("取消注册全局快捷键失败: {}", e);
                    }
                    println!("取消注册全局快捷键成功");

                    println!("window focused -{}", false);
                }
                WindowEvent::Focused(true) => {
                    let shortcut_manager = app.global_shortcut();
                    let mut handler_map: HashMap<
                        Shortcut,
                        Box<dyn Fn(&AppHandle<R>, &Shortcut) + Send + Sync + 'static>,
                    > = HashMap::new();

                    // 标准尺寸
                    handler_map.insert(
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyR),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 标准尺寸
                            let window = _app.get_webview_window("main").unwrap();
                            window.set_size(LogicalSize::new(1280.0, 768.0)).unwrap();
                        }),
                    );
                    // 最小化
                    handler_map.insert(
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyM),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 最小化
                            let window = _app.get_webview_window("main").unwrap();
                            window.minimize().unwrap();
                        }),
                    );
                    // 全屏
                    handler_map.insert(
                        Shortcut::new(None, Code::F11),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 全屏
                            let window = _app.get_webview_window("main").unwrap();
                            if let Ok(is_fullscreen) = window.is_fullscreen() {
                                let _ = window.set_fullscreen(!is_fullscreen);
                            } else {
                                let _ = window.set_fullscreen(true);
                            }
                        }),
                    );
                    // 搜索
                    handler_map.insert(
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyF),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 去搜索页面，/app/home
                            let window = _app.get_webview_window("main").unwrap();
                            window
                                .eval(&format!("window.location.href = '/app/home';"))
                                .unwrap();
                        }),
                    );
                    // 刷新页面
                    handler_map.insert(
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::F5),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 刷新页面
                            let window = _app.get_webview_window("main").unwrap();
                            window.reload().unwrap();
                        }),
                    );
                    // 调试工具
                    handler_map.insert(
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyI),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 打开调试工具
                            let window = _app.get_webview_window("main").unwrap();
                            window.open_devtools();
                        }),
                    );

                    // 打开日志目录
                    handler_map.insert(
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyL),
                        Box::new(|_app, shortcut| {
                            println!("快捷键 {:?} 被按下！", shortcut);
                            // 打开日志目录
                            let app_handle = _app.app_handle();
                            let log_folder = app_handle
                                .path()
                                .app_log_dir()
                                .unwrap_or_else(|_| PathBuf::from("."));
                            let _ = opener::open(log_folder);
                        }),
                    );

                    let shortcuts = handler_map.keys().cloned().collect::<Vec<Shortcut>>();

                    if let Err(e) =
                        shortcut_manager.on_shortcuts(shortcuts, move |app, shortcut, event| {
                            // 松开才执行，按下不执行
                            if event.state == ShortcutState::Pressed {
                                return;
                            }
                            let handler = handler_map.get(shortcut).unwrap();
                            handler(app, shortcut);
                        })
                    {
                        log::error!("快捷键监听注册失败: {}", e);
                    } else {
                        println!("快捷键监听注册成功");
                    }
                }
                _ => {}
            },
            _ => {}
        })
        .build()
}
