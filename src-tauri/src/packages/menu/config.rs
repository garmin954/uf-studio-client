use serde::Deserialize;
use std::{fs, io, path::PathBuf};
use tauri::menu::{MenuItem, Submenu};
use tauri::{AppHandle, Error, Runtime};

use crate::packages::menu::i18n;

// ======================== 1. 定义配置结构体 ========================
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuConfig {
    pub submenus: Vec<SubmenuConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmenuConfig {
    pub label: I18nKey,
    pub enabled: bool,
    pub items: Vec<MenuItemConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItemConfig {
    pub id: String,
    pub label: I18nKey,
    pub enabled: bool,
    pub accelerator: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct I18nKey {
    #[serde(rename = "zhCn")]
    pub zh_cn: String,
    #[serde(rename = "enUs")]
    pub en_us: String,
}

// ======================== 2. 加载配置文件 ========================
/// 加载菜单配置文件（支持开发/生产环境）
/// 优先从运行目录查找，找不到时退回到编译时内嵌的 JSON。
pub fn load_menu_config() -> Result<MenuConfig, Error> {
    // 1. 优先尝试从可执行文件所在目录及常见相对路径读取
    let mut json_content: Option<String> = None;

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                PathBuf::from("menu_config.json"),
                PathBuf::from("src-tauri/src/packages/menu/menu_config.json"),
                PathBuf::from("src/packages/menu/menu_config.json"),
            ];

            for rel in candidates.iter() {
                let path = exe_dir.join(rel);
                if path.exists() {
                    json_content = Some(fs::read_to_string(&path).map_err(Error::from)?);
                    break;
                }
            }
        }
    }

    // 2. 如果还没找到，再尝试从当前工作目录读取
    if json_content.is_none() {
        if let Ok(cwd) = std::env::current_dir() {
            let candidates = [
                PathBuf::from("menu_config.json"),
                PathBuf::from("src-tauri/src/packages/menu/menu_config.json"),
                PathBuf::from("src/packages/menu/menu_config.json"),
            ];

            for rel in candidates.iter() {
                let path = cwd.join(rel);
                if path.exists() {
                    json_content = Some(fs::read_to_string(&path).map_err(Error::from)?);
                    break;
                }
            }
        }
    }

    // 3. 最后兜底：使用编译时内嵌的配置
    let json = match json_content {
        Some(content) => content,
        None => include_str!("menu_config.json").to_owned(),
    };

    let config: MenuConfig = serde_json::from_str(&json)
        .map_err(|e| Error::from(io::Error::new(io::ErrorKind::Other, e)))?;

    Ok(config)
}

/// 构建单个子菜单
pub fn build_submenu<R: Runtime>(
    handle: &AppHandle<R>,
    config: SubmenuConfig,
) -> Result<Submenu<R>, Error> {
    let label = i18n::tr(config.label.zh_cn.as_str(), config.label.en_us.as_str()).to_string();

    println!("label: {}", label);
    // 创建子菜单
    let submenu = Submenu::new(handle, label, config.enabled)?;

    // 追加菜单项
    for item_cfg in config.items {
        let item = build_menu_item(handle, item_cfg)?;
        submenu.append(&item)?;
    }

    Ok(submenu)
}

/// 构建单个菜单项
pub fn build_menu_item<R: Runtime>(
    handle: &AppHandle<R>,
    config: MenuItemConfig,
) -> Result<MenuItem<R>, Error> {
    let label = i18n::tr(config.label.zh_cn.as_str(), config.label.en_us.as_str()).to_string();

    // 加速键从 String 转成 &str 传给 Tauri
    let accelerator = config.accelerator.as_deref();

    Ok(MenuItem::with_id(
        handle,
        config.id,
        label,
        config.enabled,
        accelerator,
    )?)
}
