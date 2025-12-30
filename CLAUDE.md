# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概覽

MOLi-stalknlock 是 MOLi 實驗室的 RFID 門禁系統，部署於樹莓派上。
- **後端**: FastAPI + SQLAlchemy (SQLite)
- **前端**: React 19 + TypeScript + Vite
- **硬體**: USB RFID 讀卡機 + GPIO 繼電器控制

## 開發指令

### 後端開發
```bash
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端開發
```bash
cd frontend && npm run dev
```

### Docker 部署

#### 建置多平台映像
```bash
# 設置 buildx builder（首次）
docker buildx create --use --name multiarch

# 建置並推送 ARM64 映像檔
docker buildx build --platform linux/arm64 -t bs10081/moli-door:dev --push .
```

#### 樹莓派部署
```bash
# 拉取最新映像檔並重啟
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose pull && docker compose up -d"
```

#### 樹莓派本地建置（備用）
僅在無法使用 Docker Hub 時使用：
```bash
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose build && docker compose up -d"
```

## 架構說明

### 路由結構
- `/` - Web 路由 (web.py): 登入、註冊頁面
- `/api/*` - API 端點 (api.py): RFID 掃描、模擬刷卡
- `/admin/*` - 管理 API (admin.py): CRUD、開門、記錄查詢
- `/dashboard/*` - React SPA (前端管理介面)

### 資料庫模型 (app/database.py)
- **users**: 使用者 (student_id, name, email, telegram_id, is_active)
- **cards**: 卡片 (rfid_uid, user_id, nickname, is_active) - 支援一人多卡
- **access_logs**: 存取記錄 (user_id, card_id, action, timestamp)
- **registration_sessions**: 卡片綁定暫存 (step, first_uid, expires_at, completed, nickname)
- **admins**: 管理員帳號 (username, password_hash, name, sub)

### 核心服務
- **rfid_reader.py**: RFID 讀卡機 (evdev)，支援 DEV_MODE 模擬
- **gpio_control.py**: GPIO 門鎖控制 (RPi.GPIO)
- **telegram.py**: Telegram 通知
- **auth.py**: JWT 身份驗證

## 環境變數

**必須設置的變數**（參考 `.env.example`）：

### 安全性配置（必需）
- `JWT_SECRET_KEY`: JWT 簽章密鑰（**必須設置！**建議 32+ 字元）
  ```bash
  # 生成方式
  python -c 'import secrets; print(secrets.token_urlsafe(32))'
  ```
- `JWT_ALGORITHM`: JWT 演算法（預設 HS256）
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token 有效期（預設 480 分鐘 = 8 小時）
- `RATE_LIMIT_ENABLED`: 是否啟用登入速率限制（預設 true）
- `RATE_LIMIT_PER_MINUTE`: 每分鐘最大登入嘗試次數（預設 5）

### 系統配置
- `DEV_MODE`: 開發模式（禁用實際 RFID 和 GPIO）
- `DATABASE_URL`: SQLite 資料庫路徑（預設 `sqlite:///./data/moli_door.db`）
- `BOT_TOKEN` / `TG_CHAT_ID`: Telegram 通知設定
- `RFID_DEVICE_PATH`: USB RFID 設備路徑（如 `/dev/input/by-id/usb-Sycreader...`）
- `LOCK_PIN`: GPIO 門鎖控制腳位（預設 16）
- `LOCK_ACTIVE_LEVEL`: 門鎖觸發電平（1=HIGH, 0=LOW）
- `LOCK_DURATION`: 開門持續秒數（預設 3）
- `REGISTER_TIMEOUT`: 卡片綁定超時秒數（預設 90）

## 安全性功能

本系統已實作以下安全性機制：

- ✅ **JWT 環境變數化**：SECRET_KEY 從環境變數讀取，啟動時強制驗證
- ✅ **登入速率限制**：防止暴力破解（5 次/分鐘）
- ✅ **Cookie 安全屬性**：`httponly=True`, `secure=True`, `samesite=strict`
- ✅ **Docker 最小權限**：使用 `cap_add: SYS_RAWIO` 取代 `privileged`
- ✅ **管理員專屬綁定**：公開註冊路由已移除，所有操作需管理員權限

## 部署檢查清單

部署前請確認：
- [ ] 已設置唯一的 `JWT_SECRET_KEY`（≥32 字元）
- [ ] `.env` 檔案已配置完整（參考 `.env.example`）
- [ ] Docker 容器使用 `cap_add` 而非 `privileged`
- [ ] 速率限制已測試（5 次失敗登入後鎖定 1 分鐘）
- [ ] HTTPS 已啟用（Cookie secure 屬性生效）

## RFID 刷卡流程

1. `rfid_reader.py` 讀取卡號 → 呼叫 `handle_rfid_scan()`
2. 檢查資料庫是否有活躍的 `RegistrationSession`
   - **有** → 註冊模式（二次刷卡確認綁定）
   - **無** → 正常模式（查詢卡片、檢查使用者/卡片啟用狀態、開門）
3. 發送 Telegram 通知
4. 記錄至 `access_logs`

## 卡片綁定流程（僅管理員）

**重要**：公開註冊路由已移除，所有綁定操作需透過管理介面執行。

### 方式一：新增使用者並綁定卡片（UsersPage）
1. 登入管理介面 → 使用者管理
2. 點擊「新增用戶並綁定卡片」
3. 填寫學號、姓名、Email、Telegram ID、卡片別名
4. 點擊「開始綁定」→ 90 秒內刷卡兩次
5. 系統輪詢綁定狀態，顯示步驟進度（Step 1/2 → Step 2/2）

### 方式二：為現有使用者綁定新卡片（CardsPage）
1. 登入管理介面 → 卡片管理
2. 點擊「新增卡片」→ 選擇使用者 → 填寫卡片別名
3. 點擊「使用綁定模式」→ 90 秒內刷卡兩次
4. 系統輪詢綁定狀態，顯示倒數計時和步驟進度

### 後端 API 端點（需管理員 Cookie）
- `POST /register`: 啟動綁定 session（需 `admin_token` Cookie）
- `GET /check_status/{student_id}`: 輪詢綁定狀態（需 `admin_token` Cookie）

**注意**：這兩個端點已強制驗證管理員身份，未登入會返回 401 錯誤。

## 專案結構

- `app/` - FastAPI 後端
  - `main.py` - 主程式入口、RFID 處理邏輯
  - `database.py` - SQLAlchemy ORM 模型
  - `config.py` - 環境變數配置
  - `routers/` - API 路由（api.py, admin.py, web.py）
  - `services/` - 核心服務（rfid_reader, gpio_control, telegram, auth）
- `frontend/` - React + TypeScript 前端
  - `src/pages/` - 頁面元件
  - `src/services/` - API 服務層（`cardBindingService.ts` 處理綁定功能）
  - `src/components/` - UI 元件
- `templates/` - Jinja2 模板（僅保留 login.html 作為備用）
- `static/` - CSS 靜態資源
