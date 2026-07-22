use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct FetchRequest {
    pub url: String,
    pub method: String,
    pub headers: Option<serde_json::Value>,
    pub body: Option<String>,
    pub timeout: Option<u64>, // 毫秒
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FetchResponse {
    pub status: u16,
    pub headers: serde_json::Value,
    pub data: String,
}

#[tauri::command]
pub async fn fetch_with_timeout(request: FetchRequest) -> Result<FetchResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(request.timeout.unwrap_or(5000)))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;

    let mut req_builder = match request.method.to_uppercase().as_str() {
        "GET" => client.get(&request.url),
        "POST" => client.post(&request.url),
        "PUT" => client.put(&request.url),
        "DELETE" => client.delete(&request.url),
        _ => client.get(&request.url),
    };

    // 添加 headers
    if let Some(headers) = request.headers {
        if let serde_json::Value::Object(map) = headers {
            for (key, value) in map {
                if let Some(val_str) = value.as_str() {
                    req_builder = req_builder.header(&key, val_str);
                }
            }
        }
    }

    // 添加 body
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status().as_u16();
    let headers = response
        .headers()
        .iter()
        .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
        .collect::<serde_json::Value>();

    let data = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    Ok(FetchResponse {
        status,
        headers,
        data,
    })
}

