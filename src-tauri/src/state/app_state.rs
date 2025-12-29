use std::{
    net::UdpSocket,
    sync::{atomic::AtomicBool, Arc, Mutex},
    thread,
};

use reqwest::Client;

pub struct UdpState {
    pub socket: Option<Arc<UdpSocket>>,
    pub handle: Option<thread::JoinHandle<()>>,
    pub stop_flag: Arc<AtomicBool>,
}

pub struct AppState {
    // pub user_settings: Mutex<UserSettings>,
    pub udp_state: Mutex<UdpState>,
    pub client: Arc<Client>,
}

// 创建一个新的 AppState 实例
impl AppState {
    #[allow(dead_code)]
    pub fn new() -> Self {
        AppState {
            // user_settings: Mutex::new(UserSettings::default()),
            udp_state: Mutex::new(UdpState {
                socket: None,
                handle: None,
                stop_flag: Arc::new(AtomicBool::new(false)),
            }),
            client: Arc::new(Client::new()),
        }
    }
}
