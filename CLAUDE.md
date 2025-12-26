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

必要變數（參考 `.env.production` 或 `.env.development`）：
- `DEV_MODE`: 開發模式（禁用實際 RFID）
- `DATABASE_URL`: SQLite 資料庫路徑
- `BOT_TOKEN` / `TG_CHAT_ID`: Telegram 通知
- `RFID_DEVICE_PATH`: USB RFID 設備路徑（如 `/dev/input/event0`）
- `LOCK_PIN`: GPIO 門鎖控制腳位
- `LOCK_ACTIVE_LEVEL`: 門鎖觸發電平（HIGH/LOW）
- `LOCK_DURATION`: 開門持續秒數
- `REGISTER_TIMEOUT`: 卡片綁定超時秒數

## RFID 刷卡流程

1. `rfid_reader.py` 讀取卡號 → 呼叫 `handle_rfid_scan()`
2. 檢查資料庫是否有活躍的 `RegistrationSession`
   - **有** → 註冊模式（二次刷卡確認綁定）
   - **無** → 正常模式（查詢卡片、檢查使用者/卡片啟用狀態、開門）
3. 發送 Telegram 通知
4. 記錄至 `access_logs`

## 專案結構

- `app/` - FastAPI 後端
  - `main.py` - 主程式入口、RFID 處理邏輯
  - `database.py` - SQLAlchemy ORM 模型
  - `config.py` - 環境變數配置
  - `routers/` - API 路由（api.py, admin.py, web.py）
  - `services/` - 核心服務（rfid_reader, gpio_control, telegram, auth）
- `frontend/` - React + TypeScript 前端
  - `src/pages/` - 頁面元件
  - `src/services/` - API 服務層
  - `src/components/` - UI 元件
- `templates/` - Jinja2 模板（舊版註冊頁面）
- `static/` - CSS 靜態資源
