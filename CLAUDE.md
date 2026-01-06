# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概覽

MOLi-stalknlock 是 MOLi 實驗室的 RFID 門禁系統，部署於樹莓派上。
- **後端**: FastAPI + SQLAlchemy (SQLite)
- **前端**: React 19 + TypeScript + Vite 7 + TailwindCSS
- **硬體**: USB RFID 讀卡機 (evdev) + GPIO 繼電器控制 (RPi.GPIO / rpi-lgpio)

## 開發指令

### 後端開發
```bash
# 開發伺服器
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 安裝依賴
pip install -r requirements.txt
```

### 前端開發
```bash
# 開發伺服器 (http://localhost:5173)
cd frontend && npm run dev

# 建置生產版本
npm run build

# Lint 檢查
npm run lint

# 安裝依賴
npm install
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

### Ubuntu Core Snap 部署

適用於生產環境的不可變系統部署：

```bash
# 建置 Snap (需在支援 LXD 的環境，如 macOS/Linux)
snapcraft --target-arch=arm64 --use-lxd

# 傳輸至樹莓派
scp moli-door_*.snap <user>@<pi-ip>:~/

# 安裝並連接硬體介面
sudo snap install ~/moli-door_*.snap --dangerous
sudo snap connect moli-door:raw-input
sudo snap connect moli-door:gpio-chardev pi:gpio-chardev

# 檢查服務狀態
snap services moli-door
journalctl -u snap.moli-door.moli-door -f
```

詳細說明參考 `scripts/install_ubuntu_core.md`

## 架構說明

### 路由結構
FastAPI 的路由分層設計：
- **`/` (web.py)** - Jinja2 模板頁面（舊版註冊流程）
- **`/api/*` (api.py)** - 公開 API：模擬刷卡、註冊流程
- **`/admin/*` (admin.py)** - 管理 API：需 JWT 驗證，CRUD 操作、開門、記錄查詢
- **`/dashboard/*`** - React SPA 靜態檔案 (由 FastAPI StaticFiles 提供)
  - React Router 使用 `basename="/dashboard"`
  - FastAPI 需有 catch-all 路由支援 client-side routing

### 資料庫模型 (app/database.py)
- **users**: 使用者資料 (student_id, name, email, telegram_id, is_active)
- **cards**: RFID 卡片 (rfid_uid, user_id, nickname, is_active) - 支援一人多卡
- **access_logs**: 刷卡記錄 (user_id, card_id, action, timestamp, success)
- **registration_sessions**: 卡片綁定暫存 (step, first_uid, expires_at, completed, nickname)
- **admins**: 管理員帳號 (username, password_hash, name, sub)

**注意**：資料庫 Schema 需與 SQLAlchemy 模型保持一致

### 核心服務 (app/services/)
- **rfid_reader.py**: evdev 讀取 RFID 卡號，支援 `DEV_MODE` 模擬
- **gpio_control.py**:
  - Docker: RPi.GPIO
  - Snap: rpi-lgpio (使用 gpiod)
- **telegram.py**: 刷卡事件推送通知
- **auth.py**: JWT 產生與驗證（RS256）

### RFID 刷卡流程

核心處理函式：`app/main.py:handle_rfid_scan()`

1. **讀卡** → evdev 監聽 USB RFID 設備
2. **模式判斷** → 查詢是否有未完成的 `RegistrationSession`
   - **有** → 註冊模式（二次刷卡確認綁定）
   - **無** → 正常模式（驗證使用者/卡片啟用狀態 → 開門）
3. **GPIO 控制** → `gpio_control.open_lock()` 或 `deny_access()`
4. **記錄** → 寫入 `access_logs`
5. **通知** → Telegram 推送結果

## 環境變數

必要變數（參考 `.env.production` 或 `.env.development`）：

```bash
# 開發模式（禁用實際 RFID 與 GPIO）
DEV_MODE=false

# 資料庫
DATABASE_URL=sqlite:///./data/moli_door.db

# Telegram 通知
BOT_TOKEN=your_bot_token
TG_CHAT_ID=your_chat_id

# RFID 設備路徑
RFID_DEVICE_PATH=/dev/input/event0

# GPIO 門鎖設定
LOCK_PIN=17                    # BCM GPIO 編號
LOCK_ACTIVE_LEVEL=HIGH         # 觸發電平 (HIGH/LOW)
LOCK_DURATION=3                # 開門秒數

# 註冊超時
REGISTER_TIMEOUT=90            # 卡片綁定流程超時秒數
```

## 技術注意事項

### 前端
- **Axios 版本**：使用 1.6.8，避免 Vite 7 的 ESM 解析問題
- **React Router basename**：設為 `/dashboard`，所有重定向需包含此前綴
- **Vite 配置**：已在 `vite.config.ts` 設定 axios resolve alias

### Snap 打包
- **GPIO 函式庫**：Ubuntu Core 使用 `rpi-lgpio` (strict confinement)
- **依賴分離**：`requirements-snap.txt` 使用 rpi-lgpio，一般環境用 RPi.GPIO
- **權限控制**：需連接 `raw-input` (RFID) 與 `gpio-chardev` (門鎖) plugs
- **資料庫路徑**：自動使用 `$SNAP_COMMON/moli_door.db`

### macOS 交叉編譯
- 使用 LXD 容器建置 ARM64 Snap
- 參考 `scripts/build_on_macos.md` 與 `scripts/setup-snapcraft-macos.sh`
