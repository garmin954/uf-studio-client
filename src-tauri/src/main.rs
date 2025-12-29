// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 设置时区为中国标准时间（UTC+8）会导致python那边时区不对？
    // env::set_var("TZ", "Asia/Shanghai"); // 关键代码

    ufactory_studio_lib::run()
}
