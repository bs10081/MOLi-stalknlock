# MOLi-stalknlock

MOLi 實驗室 RFID 門禁系統，部署於 Raspberry Pi。

## 功能

- 🔐 RFID 卡片刷卡開門
- 🎫 支援一人多卡（主卡、副卡）
- 📱 即時 Telegram 通知
- 💻 React Web 管理後台
- 🔑 JWT 身份驗證
- 👥 使用者與卡片啟用控制

## 技術棧

- **後端**: Python 3.11 + FastAPI + SQLAlchemy (SQLite)
- **前端**: React 19 + TypeScript + Vite + TailwindCSS
- **硬體**: Raspberry Pi + USB RFID Reader + GPIO Relay

## 快速開始

### 前置需求
- Python 3.11+
- Node.js 18+
- Docker (部署用)

### 本地開發

```bash
# 後端
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend && npm install && npm run dev
```

### Docker 部署

```bash
# 建置 ARM64 映像
docker buildx build --platform linux/arm64 -t bs10081/moli-door:dev --push .

# 樹莓派部署
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose pull && docker compose up -d"
```

### Ubuntu Core 部署（不可變系統）

適用於需要更高安全性與穩定性的生產環境。

```bash
# 1. 建置 Snap (在開發機器上)
snapcraft --target-arch=arm64 --use-lxd

# 2. 傳輸至樹莓派
scp moli-door_*.snap <user>@<pi-ip>:~/

# 3. 安裝
sudo snap install ~/moli-door_*.snap --dangerous

# 4. 連接硬體 interfaces
sudo snap connect moli-door:raw-input
sudo snap connect moli-door:gpio-chardev pi:gpio-chardev

# 5. 檢查狀態
snap services moli-door
journalctl -u snap.moli-door.moli-door -f
```

**詳細安裝指南**: 參考 [scripts/install_ubuntu_core.md](scripts/install_ubuntu_core.md)

**特點**：
- ✅ 不可變系統架構，防止意外修改
- ✅ 原子更新，失敗自動回滾
- ✅ Strict confinement 安全隔離
- ✅ 長期支援至 2036 年（Ubuntu Core 24）

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
├── src/services/     # API 服務層
└── src/components/   # UI 元件

templates/            # Jinja2 模板（註冊流程）
static/               # CSS 靜態資源
```

## 環境變數

參考 `.env.production` 或 `.env.development` 配置：

```bash
# 開發模式
DEV_MODE=true

# 資料庫
DATABASE_URL=sqlite:///./data/moli_door.db

# Telegram 通知
BOT_TOKEN=your_bot_token
TG_CHAT_ID=your_chat_id

# RFID 設備
RFID_DEVICE_PATH=/dev/input/event0

# GPIO 門鎖
LOCK_PIN=17
LOCK_ACTIVE_LEVEL=HIGH
LOCK_DURATION=3

# 註冊超時
REGISTER_TIMEOUT=90
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
