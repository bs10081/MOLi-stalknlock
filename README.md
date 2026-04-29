# MOLi-stalknlock

MOLi 實驗室 RFID 門禁系統，部署於 Raspberry Pi。

## 功能

- 🔐 RFID 卡片刷卡開門
- 🎫 支援一人多卡（主卡、副卡）
- 📱 即時 Telegram 通知
- 💻 React Web 管理後台
- 🔑 JWT 身份驗證與速率限制
- 👥 使用者與卡片啟用控制
- 🔒 **管理員專屬綁定**：移除公開註冊，所有操作需管理員權限

## 安全性功能

- ✅ **JWT 金鑰環境變數化**：SECRET_KEY 從環境變數讀取，啟動時強制驗證
- ✅ **登入速率限制**：防止暴力破解（5 次/分鐘）
- ✅ **Cookie 安全屬性**：`httponly=True`, `samesite=strict`，並可透過 `COOKIE_SECURE` 依部署環境切換
- ✅ **Docker 最小權限**：使用 `cap_add: SYS_RAWIO` 取代 `privileged`
- ✅ **管理員專屬註冊**：公開註冊路由已移除，提升系統安全性

## 技術棧

- **後端**: Python 3.11 + FastAPI + SQLAlchemy (SQLite)
- **前端**: React 19 + TypeScript + Vite + TailwindCSS
- **硬體**: Raspberry Pi + USB RFID Reader + GPIO Relay

## 快速開始

### 前置需求
- Python 3.11+
- Node.js 18+
- Docker (部署用)

### 環境配置

**重要**：系統需要環境變數才能運行。

1. 複製環境變數範本並填入實際數值：
   ```bash
   cp .env.example .env
   nano .env  # 或使用其他編輯器
   ```

2. **必須設置的變數**：
   - `JWT_SECRET_KEY`: 使用以下指令生成
     ```bash
     python -c 'import secrets; print(secrets.token_urlsafe(32))'
     ```
   - `BOT_TOKEN` / `TG_CHAT_ID`: Telegram 通知設定
   - `RFID_DEVICE_PATH`: USB RFID 讀卡機路徑

完整的環境變數清單請參考 `.env.example` 檔案。

### 本地開發

```bash
# 後端
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend && npm install && npm run dev
```

### Docker 部署

```bash
# 本地手動建置並推送 ARM64 映像
VERSION=$(cat VERSION)
GIT_SHA=$(git rev-parse HEAD)
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

docker buildx build --platform linux/arm64 \
  --build-arg APP_VERSION=$VERSION \
  --build-arg GIT_SHA=$GIT_SHA \
  --build-arg BUILD_TIME=$BUILD_TIME \
  -t bs10081/moli-door:$VERSION \
  -t bs10081/moli-door:dev \
  -t bs10081/moli-door:latest \
  --push .

# 樹莓派首次部署 / 手動更新
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose pull && docker compose up -d"
```

手動發版前，請先確認 `VERSION`、`frontend/package.json`、`frontend/package-lock.json` 已同步到相同版本號；否則管理介面顯示的版本資訊可能和實際 image tag 不一致。

### 自動化部署（GitHub Actions + Watchtower）

repo 內已提供 GitHub Actions workflow：

- Pull Request / Push：先驗證 Python 測試與前端 build
- Push 到 `main` / `v*` tag / `workflow_dispatch`：自動建置 `linux/arm64` image，推送到 Docker Hub

請先在 GitHub repository secrets 中設定：

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

推送策略：

- `main` 會更新 `bs10081/moli-door:dev` 與 `bs10081/moli-door:latest`
- Git tag（例如 `v2.1.0`）會額外推送對應版本 tag
- 每次 publish 都會再附上一個 `sha-*` tag 方便追蹤

### Watchtower

`docker-compose.yml` 已內建 `watchtower` 服務，會只監看帶有 `com.centurylinklabs.watchtower.enable=true` 的 `moli-door` 容器，並依 `WATCHTOWER_POLL_INTERVAL` 定時檢查新 image。由於原始 `containrrr/watchtower` 專案已停止維護，這裡預設改用 `nickfedor/watchtower`。

首次在樹莓派啟用：

```bash
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose pull && docker compose up -d"
```

之後只要 GitHub Actions 推出新的 Docker Hub image，Watchtower 就會自動拉取並重啟 `moli-door`。

## 專案結構

```
app/                  # FastAPI 後端
├── main.py           # 主程式入口、RFID 處理
├── database.py       # SQLAlchemy 模型
├── config.py         # 環境變數配置
├── routers/          # API 路由
│   ├── api.py        # API 端點
│   ├── admin.py      # 管理員 API
│   └── web.py        # Web 頁面路由
└── services/         # 核心服務
    ├── rfid_reader.py    # RFID 讀卡機
    ├── gpio_control.py   # GPIO 門鎖控制
    ├── telegram.py       # Telegram 通知
    └── auth.py           # JWT 身份驗證

frontend/             # React SPA
├── src/pages/        # 頁面元件
├── src/services/     # API 服務層（cardBindingService.ts 處理綁定）
└── src/components/   # UI 元件

templates/            # Jinja2 模板（僅保留 login.html 作為備用）
static/               # CSS 靜態資源
```

## 管理介面

訪問 `http://your-device-ip:8000/admin/` 並使用管理員帳號登入。

**重要提醒**：公開註冊路由已移除，所有新增使用者/綁定卡片操作需透過管理介面執行：
- **UsersPage**：新增用戶並綁定卡片
- **CardsPage**：為現有使用者綁定新卡片
- **PersonnelPage**：完整的人員管理 CRUD

## 環境變數

**完整清單請參考 `.env.example` 檔案**。

### 必須設置的安全性變數
```bash
# JWT 密鑰（必須設置！使用以下指令生成）
# python -c 'import secrets; print(secrets.token_urlsafe(32))'
JWT_SECRET_KEY=your-secure-random-32-char-secret-key-here

# 速率限制（保護登入端點）
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=5

# Cookie Secure 屬性
# 直接用 http://device-ip:8000 部署時請保持 false；
# 若前面有 HTTPS 反向代理或 TLS 終止層，請設為 true。
COOKIE_SECURE=false
```

### 系統配置範例
```bash
# 開發模式
DEV_MODE=false

# Docker Compose / Watchtower
DOCKER_IMAGE=bs10081/moli-door:dev
WATCHTOWER_POLL_INTERVAL=300
WATCHTOWER_IMAGE=nickfedor/watchtower:latest

# 資料庫
DATABASE_URL=sqlite:///./data/moli_door.db

# Telegram 通知
BOT_TOKEN=your_bot_token
TG_CHAT_ID=your_chat_id

# RFID 設備
RFID_DEVICE_PATH=/dev/input/by-id/usb-Sycreader_RFID...

# GPIO 門鎖
LOCK_PIN=16
LOCK_ACTIVE_LEVEL=1
LOCK_DURATION=3

# 註冊超時
REGISTER_TIMEOUT=90

# Cookie Secure 屬性（HTTPS 部署請改為 true）
COOKIE_SECURE=false
```

## 資料庫模型

- **users**: 使用者（學號、姓名、啟用狀態）
- **cards**: 卡片（UID、使用者、別名、啟用狀態）
- **access_logs**: 存取記錄
- **registration_sessions**: 卡片綁定暫存
- **admins**: 管理員帳號

## 授權

MIT License

## 維護者

- [NCNU-OpenSource](https://github.com/NCNU-OpenSource)
- [@bs10081](https://github.com/bs10081)
- [@ume-latte](https://github.com/ume-latte)
