# MOLi-stalknlock 🔐

[![Docker Build](https://github.com/bs10081/MOLi-stalknlock/actions/workflows/docker.yml/badge.svg)](https://github.com/bs10081/MOLi-stalknlock/actions/workflows/docker.yml)
[![Docker Hub](https://img.shields.io/docker/v/bs10081/moli-stalknlock?label=Docker%20Hub)](https://hub.docker.com/r/bs10081/moli-stalknlock)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**MOLi 門禁管理系統** - 基於 RFID 的智慧門禁控制系統，部署於 Raspberry Pi，支援一人多卡管理與兩階段卡片綁定驗證。

## ✨ 特色功能

- 🎫 **RFID 卡片管理** - 支援一人多卡，副卡綁定
- 🔐 **兩階段驗證** - 安全的卡片綁定流程（刷卡兩次確認）
- 📊 **即時儀表板** - React 19 前端，響應式設計
- 🔔 **Telegram 通知** - 自動通知門禁事件
- 🎛️ **GPIO 控制** - 直接控制門鎖硬體
- 📝 **存取記錄** - 完整的門禁紀錄追蹤
- 🐳 **Docker 部署** - 支援 ARM64 和 AMD64 架構

## 🏗️ 技術棧

### 後端
- **FastAPI** - 高效能 Python Web 框架
- **SQLAlchemy** - ORM 資料庫管理
- **SQLite** - 輕量級資料庫
- **RPi.GPIO** - Raspberry Pi GPIO 控制

### 前端
- **React 19** - 現代化 UI 框架
- **TypeScript** - 型別安全
- **Vite** - 快速建置工具
- **Tailwind CSS** - 實用優先的 CSS 框架
- **React Router** - 前端路由

### 硬體
- **Raspberry Pi** (ARM64)
- **RFID 讀卡機** (evdev)
- **GPIO 門鎖控制**

## 🚀 快速開始

### 使用 Docker（推薦）

```bash
# 拉取最新映像（支援 ARM64 和 AMD64）
docker pull bs10081/moli-stalknlock:latest

# 使用 Docker Compose 啟動
docker compose up -d
```

### 本地開發

#### 前置需求
- Python 3.11+
- Node.js 18+
- SQLite3

#### 後端設置

```bash
# 建立虛擬環境
python3 -m venv venv
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt

# 啟動開發伺服器
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端設置

```bash
cd frontend

# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build
```

## 🔧 環境變數

建立 `.env` 檔案：

```bash
# 開發模式（本機測試）
DEV_MODE=true

# 資料庫
DATABASE_URL=sqlite:///./moli_door.db

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
TG_CHAT_ID=your_telegram_chat_id

# GPIO 設定
LOCK_PIN=16
LOCK_ACTIVE_LEVEL=1
LOCK_DURATION=3

# RFID 設備路徑
RFID_DEVICE_PATH=/dev/input/by-id/usb-Sycreader...

# 時區
TZ=Asia/Taipei
```

## 📖 使用說明

### 管理員登入

訪問 `http://your-pi-ip:8000/` 自動重定向至管理儀表板。

預設管理員帳號需透過 `create_default_admin.py` 建立：

```bash
python3 create_default_admin.py
```

### 卡片綁定流程

1. 登入管理儀表板
2. 點擊「新增用戶並綁定卡片」
3. 填寫使用者資訊（學號、姓名、Email、Telegram ID）
4. 系統進入綁定模式（90 秒倒數計時）
5. 使用者在讀卡機上刷卡**兩次**（相同卡片）
6. 綁定成功，門鎖開啟慶祝

### 開發模式測試

當 `DEV_MODE=true` 時，可使用 API 模擬 RFID 刷卡：

```bash
curl -X POST http://localhost:8000/dev/simulate-scan \
  -H "Content-Type: application/json" \
  -d '{"card_uid": "1234567890"}'
```

## 🐳 Docker 部署

### 樹莓派部署（ARM64）

```bash
# 1. 拉取映像
docker compose pull

# 2. 啟動服務
docker compose up -d

# 3. 查看日誌
docker compose logs -f
```

### 多架構建置

GitHub Actions 自動建置並推送至 Docker Hub：

- `bs10081/moli-stalknlock:main` - 主要穩定版本
- `bs10081/moli-stalknlock:dev` - 開發版本
- `bs10081/moli-stalknlock:latest` - 最新穩定版本

支援架構：
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64 / Raspberry Pi)

## 📂 專案結構

```
MOLi-stalknlock/
├── app/                      # 後端應用
│   ├── main.py              # FastAPI 入口、RFID 處理
│   ├── database.py          # SQLAlchemy 模型
│   ├── config.py            # 環境變數配置
│   ├── routers/             # API 路由
│   │   ├── api.py          # RESTful CRUD API
│   │   ├── admin.py        # 管理員認證 API
│   │   └── web.py          # 傳統網頁端點
│   └── services/            # 核心服務
│       ├── rfid_reader.py  # RFID 讀卡機
│       ├── gpio_control.py # GPIO 門鎖控制
│       ├── telegram.py     # Telegram 通知
│       └── auth.py         # JWT 認證
├── frontend/                # React 前端
│   ├── src/
│   │   ├── pages/          # 頁面元件
│   │   ├── components/     # UI 元件
│   │   └── services/       # API 服務
│   └── dist/               # 建置輸出
├── templates/              # Jinja2 模板（舊版）
├── Dockerfile              # 多架構 Docker 映像
├── docker-compose.yml      # Docker Compose 配置
└── CLAUDE.md              # 開發者指南
```

## 🔐 安全性

- ✅ JWT 認證保護管理介面
- ✅ 兩階段卡片綁定驗證
- ✅ 環境變數管理敏感資訊
- ✅ HTTPS 支援（透過反向代理）
- ⚠️ 預設使用 SQLite（小型部署）

## 🛠️ 故障排除

### RFID 讀卡機無法識別

```bash
# 1. 檢查 USB 設備
lsusb | grep -i reader

# 2. 檢查設備檔案
ls -la /dev/input/by-id/ | grep -i reader

# 3. 檢查容器日誌
docker compose logs --tail=50 | grep -iE 'rfid|error'
```

詳細故障排除請參考 [CLAUDE.md - RFID 讀卡機故障診斷](./CLAUDE.md#rfid-讀卡機故障診斷)。

## 📊 資料庫管理

```bash
# 檢查資料庫
python3 check_db.py

# 查看資料庫內容
python3 view_sqlite.py
```

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

[MIT License](LICENSE)

## 👤 作者

**bs10081**

- GitHub: [@bs10081](https://github.com/bs10081)
- Docker Hub: [bs10081/moli-stalknlock](https://hub.docker.com/r/bs10081/moli-stalknlock)

---

⚡ Powered by FastAPI + React + Raspberry Pi
