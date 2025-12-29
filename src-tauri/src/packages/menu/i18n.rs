use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    fmt,
    sync::{LazyLock, Mutex},
};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;
#[derive(Clone, Copy, Serialize, Deserialize)]
pub enum AppLanguage {
    ZhCn,
    EnUs,
}

impl Default for AppLanguage {
    fn default() -> Self {
        AppLanguage::ZhCn
    }
}
impl fmt::Display for AppLanguage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                AppLanguage::ZhCn => "zh_CN",
                AppLanguage::EnUs => "en_US",
            }
        )
    }
}

// 全局缓存当前语言（Lazy + Mutex 保证线程安全且仅初始化一次）
static CURRENT_LANG: LazyLock<Mutex<AppLanguage>> =
    LazyLock::new(|| Mutex::new(AppLanguage::default()));

pub fn init_language<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("app_settings.json")?;
    println!("init_language: {:?}", store.values());
    let lang = store.get("language".to_string()).unwrap_or(json!("zh_CN"));

    {
        // 更新全局缓存
        *CURRENT_LANG.lock().unwrap() = match lang.as_str() {
            Some("zh_CN") => AppLanguage::ZhCn,
            Some("en_US") => AppLanguage::EnUs,
            _ => AppLanguage::default(),
        };
    }

    Ok(())
}

/// 只在首次调用时从系统环境变量检测语言，之后使用内存中的全局语言
#[allow(dead_code)]
fn detect_system_language() -> AppLanguage {
    // 获取localStorage中的语言
    let candidates = ["LC_ALL", "LANGUAGE", "LANG"];
    for key in candidates {
        if let Ok(val) = std::env::var(key) {
            let lower = val.to_lowercase();
            if lower.starts_with("en") {
                return AppLanguage::EnUs;
            }
        }
    }
    AppLanguage::ZhCn
}

pub fn set_language<R: Runtime>(
    lang: &AppLanguage,
    app: &AppHandle<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("app_settings.json")?;
    store.set("language", json!(lang.to_string()));
    store.save()?;

    // 更新全局缓存
    *CURRENT_LANG.lock().unwrap() = lang.clone();
    Ok(())
}

/// 当前应用语言（可被菜单切换动态更新）
pub fn detect_language() -> AppLanguage {
    *CURRENT_LANG.lock().unwrap()
}

/// 简单的中英翻译辅助函数
pub fn tr<'a>(zh: &'a str, en: &'a str) -> &'a str {
    let lang = detect_language();
    // 从store中获取
    match lang {
        AppLanguage::ZhCn => zh,
        AppLanguage::EnUs => en,
    }
}
