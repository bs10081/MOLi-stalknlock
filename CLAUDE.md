# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

**MOLi-stalknlock** 是部署於 Raspberry Pi 的 RFID 門禁控制系統，支援一人多卡管理與兩階段卡片綁定驗證。

### 技術棧

- **後端**: FastAPI + SQLAlchemy ORM + SQLite
- **前端**: React 19 + TypeScript + Vite + Tailwind CSS + React Router
- **硬體**: RFID 讀卡機 (evdev)、GPIO 門鎖控制 (RPi.GPIO)
- **通知**: Telegram Bot
- **部署**: Docker (ARM64 for Raspberry Pi)

## 核心架構

### 資料模型

```
User (1) ----< Cards (N)
  |
  +----< AccessLog (記錄使用哪張卡片)
  |
  +----< RegistrationSession (卡片綁定狀態)

Admin (獨立的管理員系統)
```

### 關鍵服務層

- `app/services/rfid_reader.py`: RFID 讀取（支援開發模式模擬）
- `app/services/gpio_control.py`: GPIO 門鎖控制（支援 Mock 模式）
- `app/services/telegram.py`: Telegram 通知
- `app/services/auth.py`: JWT 認證

### 路由架構

- `app/routers/api.py`: RESTful API (CRUD 操作)
- `app/routers/admin.py`: 管理員認證與 API
- `app/routers/web.py`: 傳統網頁端點（Jinja2 模板）

### 兩階段卡片綁定流程

1. 管理員透過 `/mode/register` 啟動綁定 session（90 秒有效期）
2. 使用者第一次刷卡：記錄 UID，step = 1
3. 使用者第二次刷卡：
   - 若 UID 一致：綁定成功，開門慶祝
   - 若 UID 不一致：重置 session

**重要設計原則**:
- 門鎖控制是**同步最高優先級**（立即執行）
- 資料庫記錄與 Telegram 通知為**背景任務**（不阻塞開門）

## 開發環境設定

### 環境變數 (.env)

必要配置：
```bash
# 開發模式（跳過硬體初始化）
DEV_MODE=true

# 資料庫
DATABASE_URL=sqlite:///./moli_door.db

# Telegram
BOT_TOKEN=your_bot_token
TG_CHAT_ID=your_chat_id

# GPIO 設定
LOCK_PIN=16
LOCK_ACTIVE_LEVEL=1
LOCK_DURATION=3

# RFID 設備路徑
RFID_DEVICE_PATH=/dev/input/by-id/usb-Sycreader...
```

### 本機開發命令

```bash
# 後端開發（含熱重載）
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端開發
cd frontend && npm run dev

# 前端建置
cd frontend && npm run build

# 建立管理員帳號
python3 create_default_admin.py
```

### 開發模式測試

當 `DEV_MODE=true` 時，可使用 API 模擬 RFID 刷卡：

```bash
# 模擬刷卡
curl -X POST http://localhost:8000/dev/simulate-scan \
  -H "Content-Type: application/json" \
  -d '{"card_uid": "1234567890"}'
```

## Docker 部署工作流程

### 本地建置 ARM64 映像檔（推薦）

```bash
# 首次設置 buildx builder
docker buildx create --use --name multiarch

# 建置並推送至 Docker Hub
docker buildx build --platform linux/arm64 -t bs10081/moli-door:dev --push .
```

### 樹莓派部署

```bash
# Git 方式部署（推薦）
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && git pull && docker compose pull && docker compose up -d"

# 直接重啟容器
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose pull && docker compose up -d"
```

### 樹莓派本地建置（備用）

僅在無法使用 Docker Hub 時：

```bash
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose build && docker compose up -d"
```

## 重要技術細節

### 硬體抽象層

系統會自動偵測執行環境：
- **生產模式**（Raspberry Pi）：使用真實 GPIO + evdev
- **開發模式**（本機）：使用 Mock GPIO + API 模擬刷卡

判斷邏輯：
```python
# config.py
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

# rfid_reader.py
self.dev_mode = DEV_MODE or not os.path.exists("/dev/input")
```

### Docker 特權模式

`docker-compose.yml` 中的關鍵配置：
- `privileged: true`: 允許 GPIO 存取
- `network_mode: host`: 更好的裝置存取
- `devices`: 掛載 `/dev/gpiomem` 和 `/dev/input`

### 前端 SPA 路由

FastAPI 的 catch-all 路由處理 React Router：

```python
@app.get("/admin/{full_path:path}")
@app.get("/dashboard/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse("frontend/dist/index.html")
```

## 資料庫管理

```bash
# 檢查資料庫
python3 check_db.py

# 查看資料庫內容
python3 view_sqlite.py

# 資料庫遷移腳本（已有）
python3 migrate_*.py
```

## 專案結構

```
app/
  ├── main.py              # FastAPI 應用入口、RFID 處理邏輯
  ├── database.py          # SQLAlchemy 模型定義
  ├── config.py            # 環境變數配置
  ├── routers/             # API 路由
  │   ├── api.py          # RESTful CRUD API
  │   ├── admin.py        # 管理員認證 API
  │   └── web.py          # 傳統網頁端點
  └── services/            # 核心服務
      ├── rfid_reader.py  # RFID 讀卡機
      ├── gpio_control.py # GPIO 門鎖控制
      ├── telegram.py     # Telegram 通知
      └── auth.py         # JWT 認證

frontend/
  ├── src/
  │   ├── pages/          # 頁面元件
  │   │   ├── dashboard/  # 儀表板頁面
  │   │   └── LoginPage.tsx
  │   ├── components/     # UI 元件
  │   │   ├── layout/     # 版面元件
  │   │   └── ui/         # 基礎 UI 元件
  │   └── App.tsx         # React Router 配置
  └── dist/               # 建置輸出（會被複製到 Docker）
```
