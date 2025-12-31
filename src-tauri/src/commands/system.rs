use crate::state::app_state::AppState;
use serde::Serialize;
use std::sync::atomic::Ordering;
use std::time::Duration;
use tauri::Manager;

use log::{error, info, trace};
use std::net::{SocketAddr, UdpSocket};
use std::sync::Arc;
use std::thread::{self, sleep};
use tauri::Emitter;
use tauri::{AppHandle, Runtime, Window};

#[tauri::command]
/// 退出应用
pub async fn app_exit<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    app.exit(0);
}

#[derive(Serialize, Clone)]
struct ArmIpIntro {
    addr_type: String,
    ip: String,
    port: String,
    axis: String,
    device_type: String,
    version: String,
    arm_sn: String,
    control_sn: String,
}

/// 启动 UDP 广播
#[tauri::command]
pub fn start_udp_broadcast<R: Runtime>(app: AppHandle<R>, window: Window<R>) -> Result<(), String> {
    let _ = window.emit("xarm_ip", "begin");
    let state: tauri::State<'_, AppState> = app.state::<AppState>();
    let mut udp_state = state.udp_state.lock().map_err(|e| e.to_string())?;

    // 如果已经开启，直接返回
    if udp_state.socket.is_some() {
        return Err("UDP broadcast is already running".to_string());
    }

    // 绑定到本地地址和端口
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.set_broadcast(true).map_err(|e| e.to_string())?;

    // 设置 socket 为非阻塞模式，设置超时时间
    socket
        .set_read_timeout(Some(Duration::from_millis(500)))
        .map_err(|e| e.to_string())?;

    // 克隆 socket 用于线程
    let socket = Arc::new(socket);
    let socket_clone = Arc::clone(&socket);

    // 广播地址和端口
    let broadcast_addr = "255.255.255.255:18355";
    let message = "get_xarm_addr";

    // 发送广播消息
    socket
        .send_to(message.as_bytes(), broadcast_addr)
        .map_err(|e| e.to_string())?;

    // 启动线程接收回复
    let stop_flag = Arc::clone(&udp_state.stop_flag);
    let handle = thread::spawn(move || {
        let mut buf = [0; 1024];
        loop {
            // 检查标志位
            if stop_flag.load(Ordering::SeqCst) {
                info!("Stopping UDP broadcast...");
                break;
            }

            match socket_clone.recv_from(&mut buf) {
                Ok((amt, src)) => {
                    let received_data = String::from_utf8_lossy(&buf[..amt]);
                    info!("Received from {}: {}", src, received_data);

                    match parse_received_data(&received_data, &src) {
                        Ok(arm_ip_intro) => {
                            if let Err(e) = window.emit("xarm_ip", arm_ip_intro) {
                                error!("Failed to emit event: {}", e);
                            }
                        }
                        Err(e) => {
                            error!("parse_received_data: {}", e);
                        }
                    }
                }
                Err(e) => {
                    // 如果是超时错误，继续循环
                    if e.kind() == std::io::ErrorKind::WouldBlock {
                        sleep(Duration::from_millis(10)); // 短暂睡眠，减少 CPU 占用
                        continue;
                    }
                    // 如果 socket 被关闭，recv_from 会返回错误
                    if stop_flag.load(Ordering::SeqCst) {
                        break; // 正常退出
                    }
                    error!("Error receiving data: {}", e);
                    break;
                }
            }
        }
    });

    // 更新状态
    udp_state.socket = Some(socket);
    udp_state.handle = Some(handle);

    info!("UDP broadcast started");
    Ok(())
}

/// 解析接收到的数据
fn parse_received_data(data: &str, src: &SocketAddr) -> Result<ArmIpIntro, String> {
    let src_string = src.to_string();
    let addr: Vec<&str> = src_string.split(':').collect();
    if addr.len() != 2 {
        return Err("Invalid source address format".to_string());
    }

    let parts: Vec<&str> = data.split(':').collect();

    println!("parts==>{:?}", parts);

    if parts.len() != 3 {
        return Err("Invalid received data format".to_string());
    }

    let intro: Vec<&str> = parts[1].split(',').collect();
    if intro.len() != 5 {
        return Err("Invalid intro format".to_string());
    }

    let types: Vec<&str> = vec!["xarm", "XARM", "uf", "UF"];
    if types.contains(&parts[0]) && parts.len() >= 2 {
        let addr_type = if parts.len() > 2 {
            if parts[2] == "LOCAL" {
                "localhost"
            } else {
                parts[2]
            }
        } else {
            "unknown"
        };
        return Ok(ArmIpIntro {
            addr_type: addr_type.to_string(),
            ip: addr[0].to_string(),
            port: addr[1].to_string(),
            axis: intro[0].to_string(),
            device_type: intro[1].to_string(),
            arm_sn: intro[2].trim().to_string(),
            control_sn: intro[3].trim().to_string(),
            version: intro[4].to_string(),
        });
    } else {
        return Err("Invalid type".to_string());
    }
}

// 关闭 UDP 广播
#[tauri::command]
pub fn stop_udp_broadcast<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    info!("UDP broadcast stop!");

    let state = app.state::<AppState>();
    let mut udp_state = state.udp_state.lock().map_err(|e| e.to_string())?;

    // 如果没有开启，直接返回
    if udp_state.socket.is_none() {
        return Err("UDP broadcast is not running".to_string());
    }

    // 设置标志位，通知线程退出
    udp_state.stop_flag.store(true, Ordering::SeqCst);

    // 关闭 socket，唤醒阻塞的 recv_from
    if let Some(socket) = udp_state.socket.take() {
        drop(socket);
    }

    // 等待线程退出
    if let Some(handle) = udp_state.handle.take() {
        if let Err(e) = handle.join() {
            error!("Failed to join thread: {:?}", e);
        }
    }

    // 重置状态
    udp_state.stop_flag.store(false, Ordering::SeqCst);

    info!("UDP broadcast stopped");
    Ok(())
}

#[tauri::command]
pub fn ping(target: i64, rid: i64) -> Result<i64, String> {
    // log::log!(Level::Info, "【pong_{}】", rid);
    //这里的日志单独写到一个文件中
    trace!(target: "ping", "【pong_{}】", rid);
    // 实现ping的功能

    Ok(target)
}

// open devtools
#[tauri::command]
pub fn open_devtools<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let webview = app
        .get_webview_window("main")
        .ok_or("Failed to get webview window")?;
    if !webview.is_devtools_open() {
        webview.open_devtools();
    }
    Ok(())
}
