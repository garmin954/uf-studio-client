use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[allow(dead_code)]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("env")
        .setup(|_app, _window| {
            let _ = cfg!(debug_assertions);

            Ok(())
        })
        .build()
}
