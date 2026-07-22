# force_update
false
# description
## zhCn
新增 Rust 后端 HTTP 请求，绕过前端 CORS 限制！
## enUs
New Rust backend HTTP fetch to bypass CORS restrictions!
# content
## zhCn
feat: 后端HTTP请求绕过CORS限制，新增fetch_with_timeout命令
- 新增 Rust 后端命令 fetch_with_timeout，支持 GET/POST/PUT/DELETE
- 前端 fetchWithAbortTimeout 改为通过 invoke 调用后端，绕过 CORS
- 修复 reqwest json feature 缺失导致的编译错误


## enUs
feat: Backend HTTP requests bypass CORS, added fetch_with_timeout command
- New Rust backend command fetch_with_timeout, supports GET/POST/PUT/DELETE
- Frontend fetchWithAbortTimeout now calls backend via invoke, bypassing CORS
- Fix reqwest json feature missing compilation error
