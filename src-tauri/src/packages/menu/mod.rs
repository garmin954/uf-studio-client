pub mod config;
pub mod i18n;
use tauri::Emitter;
use tauri::{
    menu::{IsMenuItem, Menu, MenuEvent, MenuItemKind, Submenu},
    plugin::{Builder as PluginBuilder, TauriPlugin},
    AppHandle, Error, LogicalSize, Manager, Runtime,
};
use tauri_plugin_dialog::DialogExt;

/// 初始化菜单
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    PluginBuilder::new("app_menu")
        .setup(|app, _api| {
            let _ = i18n::init_language(app);
            let menu = mount(app)?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| event_handler(app, &event));
            Ok(())
        })
        .build()
}

/// 挂载
/// # 参数
/// * `handle` - 应用句柄
/// # 返回
/// * `Result<Menu<R>, Error>` - 菜单
/// # 示例
/// ```
/// let menu = mount(handle)?;
/// ```
pub fn mount<R: Runtime>(handle: &AppHandle<R>) -> Result<Menu<R>, Error> {
    // 加载配置
    let menu_config = config::load_menu_config()?;

    // 遍历构建子菜单
    let submenus: Vec<Submenu<R>> = menu_config
        .submenus
        .into_iter()
        .map(|sub_config| config::build_submenu(handle, sub_config))
        .collect::<Result<_, _>>()?;

    // 构建主菜单
    // 将 Submenu<R> 转成 &dyn IsMenuItem<R>
    let item_refs: Vec<&dyn IsMenuItem<R>> =
        submenus.iter().map(|s| s as &dyn IsMenuItem<R>).collect();

    Ok(Menu::with_items(handle, &item_refs)?)
}

///切换语言 confirm 弹窗确认事件处理
/// # 参数
/// * `app` - 应用句柄
/// * `event` - 菜单事件
/// # 示例
/// ```
/// let event = switch_language_event(app, &event);
/// ```
pub fn switch_language_event<R: Runtime>(app: &AppHandle<R>, lang: i18n::AppLanguage) -> () {
    let handle = app.app_handle().clone();
    app.dialog()
        .message(i18n::tr(
            "确定要切换语言吗？该操作将会刷新页面，请确认是否继续",
            "Are you sure you want to switch language? This operation will refresh the page, please confirm whether to continue",
        ))
        .title(i18n::tr("切换语言", "Switch Language"))
        .show(move |result: bool| {
            if result {
                let _ = i18n::set_language(&lang, &handle);
                #[cfg(desktop)]
                if let Some(menu) = handle.menu() {
                    let _ = update_menu_language(&menu);

                    let window = handle.get_webview_window("main").unwrap();

                    let lang_str = match lang {
                        i18n::AppLanguage::ZhCn => "cn",
                        i18n::AppLanguage::EnUs => "en",
                    };
                    window
                        .eval(&format!(
                            "localStorage.setItem('language', '{}');",
                            lang_str
                        ))
                        .unwrap();

                    window.reload().unwrap();
                }
                // let _ = update_menu_language(&app.menu().unwrap());
            }
        });
}

/// 菜单事件处理
/// # 参数
/// * `app` - 应用句柄
/// * `event` - 菜单事件
/// # 示例
/// ```
/// let event = menu_event(app, &event);
/// ```
pub fn event_handler<R: Runtime>(app: &AppHandle<R>, event: &MenuEvent) {
    let id = event.id().as_ref();
    if let Some(window) = app.get_webview_window("main") {
        match id {
            "language_zh_CN" => {
                switch_language_event(app, i18n::AppLanguage::ZhCn);
            }
            "language_en_US" => {
                switch_language_event(app, i18n::AppLanguage::EnUs);
            }
            // 标准尺寸
            "window_standard_size" => {
                let _ = window.set_fullscreen(false);
                let _ = window.set_size(LogicalSize::new(1280.0, 768.0));
                let _ = window.center();
                let _ = window.set_focus();
            }
            // 最小尺寸
            "window_min_size" => {
                let _ = window.set_fullscreen(false);
                let _ = window.set_size(LogicalSize::new(1080.0, 648.0));
                let _ = window.center();
                let _ = window.set_focus();
            }
            // 最小化
            "window_minimize" => {
                let _ = window.minimize();
            }
            // 全屏切换
            "window_fullscreen" => {
                if let Ok(is_fullscreen) = window.is_fullscreen() {
                    let _ = window.set_fullscreen(!is_fullscreen);
                } else {
                    let _ = window.set_fullscreen(true);
                }
            }

            // 搜索页面
            "tool_search" => {
                window
                    .eval(&format!("window.location.href = '/app/home';"))
                    .unwrap();
            }
            // 检查更新
            "tool_check_updates" => {
                window.emit("check_updates", id.to_string()).unwrap();
            }
            // 刷新页面
            "tool_refresh_page" => {
                window.reload().unwrap();
            }
            // 打开调试工具
            "tool_open_devtools" => {
                window.open_devtools();
            }
            _ => {
                window.emit("menu_event", id.to_string()).unwrap();
            }
        }
    }
}

/// 根据当前语言动态更新菜单及子项的文案
/// # 参数
/// * `menu` - 菜单
/// * `lang` - 语言
/// # 返回
/// * `Result<(), Error>` - 结果
/// # 示例
/// ```
/// let menu = update_menu_language(menu, lang)?;
/// ```
#[cfg(desktop)]
fn update_menu_language<R: tauri::Runtime>(menu: &Menu<R>) -> tauri::Result<()> {
    // 重新读取 menu_config.json 以获取最新的文案配置
    let menu_config = config::load_menu_config()?;

    let items = menu.items()?;

    // 按顺序将配置中的子菜单与实际菜单中的 Submenu 对应起来
    for (submenu_cfg, item_kind) in menu_config.submenus.into_iter().zip(items.into_iter()) {
        if let MenuItemKind::Submenu(sub) = item_kind {
            // 更新子菜单标题
            let submenu_label = i18n::tr(
                submenu_cfg.label.zh_cn.as_str(),
                submenu_cfg.label.en_us.as_str(),
            );
            sub.set_text(submenu_label)?;

            // 更新子菜单中的每个菜单项标题
            let child_items = sub.items()?;
            for (item_cfg, child_kind) in submenu_cfg.items.into_iter().zip(child_items.into_iter())
            {
                if let MenuItemKind::MenuItem(mi) = child_kind {
                    let item_label =
                        i18n::tr(item_cfg.label.zh_cn.as_str(), item_cfg.label.en_us.as_str());
                    mi.set_text(item_label)?;
                }
            }
        }
    }

    Ok(())
}
