use serde::Serialize;

#[derive(Serialize)]
pub struct Response<T> {
    pub code: i32,
    pub data: Option<T>,
    pub msg: String,
}

#[allow(dead_code)]
impl<T> Response<T> {
    pub fn success(data: T) -> Self {
        Self::new(0, Some(data), "success")
    }

    pub fn error(msg: impl Into<String>) -> Self {
        Self::new(-1, None, msg)
    }

    // 添加自定义状态码的方法
    #[allow(unused)]
    #[allow(dead_code)]
    pub fn new(code: i32, data: Option<T>, msg: impl Into<String>) -> Self {
        Self {
            code,
            data,
            msg: msg.into(),
        }
    }
}
