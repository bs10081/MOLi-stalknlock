# macOS ARM64 上建置 Snap 指南

本指南說明如何在 macOS ARM64 (Apple Silicon) 上建置 arm64 架構的 snap 封包。

---

## 方案 A：使用 Multipass（推薦）

### 安裝 Multipass

```bash
# 使用 Homebrew 安裝
brew install --cask multipass

# 驗證安裝
multipass version
```

### 建立 Ubuntu VM

```bash
# 啟動 Ubuntu 24.04 ARM64 虛擬機
multipass launch 24.04 --name snapcraft-builder --memory 4G --disk 20G --cpus 2

# 進入 VM
multipass shell snapcraft-builder
```

### 在 VM 中安裝 Snapcraft

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 snapcraft
sudo snap install snapcraft --classic

# 安裝 LXD（用於隔離建置環境）
sudo snap install lxd
sudo lxd init --auto

# 將當前用戶加入 lxd 群組
sudo usermod -a -G lxd $USER
newgrp lxd
```

### 掛載專案目錄

```bash
# 在 macOS 終端機執行（不是 VM 內）
multipass mount /Users/bs10081/Developer/MOLi-stalknlock snapcraft-builder:/home/ubuntu/MOLi-stalknlock

# 進入 VM 並驗證
multipass shell snapcraft-builder
cd ~/MOLi-stalknlock
ls -la
```

### 建置 Snap

```bash
# 在 VM 內執行
cd ~/MOLi-stalknlock

# 使用 LXD 容器建置（推薦）
snapcraft --use-lxd

# 建置完成後，snap 檔案會在當前目錄
ls -la *.snap
```

### 取得建置結果

```bash
# 在 macOS 終端機執行
multipass transfer snapcraft-builder:/home/ubuntu/MOLi-stalknlock/moli-door_*.snap .
```

---

## 方案 B：使用 Docker

### 前置需求

```bash
# 安裝 Docker Desktop for Mac
brew install --cask docker

# 啟動 Docker Desktop
open -a Docker
```

### 建置腳本

建立 `build-snap-docker.sh`：

```bash
#!/bin/bash
# build-snap-docker.sh - 使用 Docker 建置 Snap

set -e

echo "🔨 在 Docker 容器中建置 Snap..."

# 使用官方 snapcraft 映像
docker run --rm \
  --platform linux/arm64 \
  -v "$(pwd):/build" \
  -w /build \
  snapcore/snapcraft:latest \
  snapcraft --destructive-mode

echo "✅ 建置完成！"
ls -lh *.snap
```

### 執行建置

```bash
chmod +x build-snap-docker.sh
./build-snap-docker.sh
```

**注意**：使用 `--destructive-mode` 會在容器內直接建置，不使用額外的隔離層。

---

## 方案 C：使用 Launchpad 遠端建置

### 設定 Launchpad

1. 註冊 [Launchpad](https://launchpad.net) 帳戶
2. 建立 SSH 金鑰並上傳：
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   # 上傳公鑰至 https://launchpad.net/~yourusername/+editsshkeys
   ```

3. 安裝 snapcraft 並登入：
   ```bash
   # 在 Multipass VM 或 Linux 環境中
   sudo snap install snapcraft --classic
   snapcraft login
   ```

### 遠端建置

```bash
# 推送至 Launchpad 建置
snapcraft remote-build --launchpad-accept-public-upload
```

建置完成後會自動下載所有架構的 snap 檔案。

---

## 建置測試清單

### 1. 驗證 snapcraft.yaml 語法

```bash
# 在 VM/容器內
cd ~/MOLi-stalknlock
snapcraft lint
```

### 2. 檢查 snap 檔案

```bash
# 列出 snap 內容
unsquashfs -l moli-door_*.snap | head -20

# 檢查 metadata
snap info moli-door_*.snap
```

### 3. 本地測試安裝（在 VM 內）

```bash
# 安裝 snap
sudo snap install moli-door_*.snap --dangerous --devmode

# 檢查服務（可能會失敗，因為沒有硬體）
snap services moli-door

# 查看日誌
journalctl -u snap.moli-door.moli-door -f
```

---

## 常見問題

### Q1: Multipass VM 效能慢

**解決**：增加資源配置
```bash
multipass stop snapcraft-builder
multipass set local.snapcraft-builder.memory=8G
multipass set local.snapcraft-builder.cpus=4
multipass start snapcraft-builder
```

### Q2: Docker 建置卡在下載依賴

**解決**：使用 Docker BuildKit
```bash
export DOCKER_BUILDKIT=1
docker run --rm --platform linux/arm64 \
  -v "$(pwd):/build" -w /build \
  -e BUILDKIT_PROGRESS=plain \
  snapcore/snapcraft:latest snapcraft --destructive-mode
```

### Q3: snapcraft 建置錯誤

**常見錯誤**：
- **缺少 npm**：確保 frontend 部分正確配置
- **Python 依賴失敗**：檢查 requirements-snap.txt
- **權限問題**：在 LXD 容器內建置時避免

**除錯指令**：
```bash
snapcraft clean
snapcraft --debug
```

### Q4: 如何清理建置環境

```bash
# Multipass
multipass delete snapcraft-builder
multipass purge

# Docker
docker system prune -a

# Snapcraft 快取
snapcraft clean
rm -rf parts/ stage/ prime/ *.snap
```

---

## 效能比較

| 方案 | 速度 | 隔離性 | 易用性 | 推薦度 |
|------|------|--------|--------|--------|
| Multipass | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ 最推薦 |
| Docker | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 適合 CI/CD |
| Launchpad | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️ 需網路 |

---

## 快速開始腳本

整合腳本 `setup-snapcraft-macos.sh`：

```bash
#!/bin/bash
# setup-snapcraft-macos.sh - macOS ARM64 Snap 建置環境設置

set -e

echo "🍎 macOS ARM64 Snapcraft 建置環境設置"
echo ""

# 檢查是否為 ARM64
if [[ $(uname -m) != "arm64" ]]; then
    echo "❌ 此腳本僅支援 ARM64 Mac"
    exit 1
fi

# 檢查 Homebrew
if ! command -v brew &> /dev/null; then
    echo "📦 安裝 Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# 安裝 Multipass
echo "📦 安裝 Multipass..."
brew install --cask multipass || echo "Multipass 已安裝"

# 啟動 VM
echo "🚀 建立 Ubuntu VM..."
multipass launch 24.04 --name snapcraft-builder --memory 4G --disk 20G --cpus 2 || echo "VM 已存在"

# 設定 VM
echo "⚙️  配置 VM..."
multipass exec snapcraft-builder -- bash -c '
    sudo apt update -qq
    sudo snap install snapcraft --classic
    sudo snap install lxd
    sudo lxd init --auto
    sudo usermod -a -G lxd ubuntu
'

# 掛載專案
echo "📂 掛載專案目錄..."
PROJECT_DIR="$(pwd)"
multipass mount "$PROJECT_DIR" snapcraft-builder:/home/ubuntu/MOLi-stalknlock

echo ""
echo "✅ 設置完成！"
echo ""
echo "下一步："
echo "  1. 進入 VM: multipass shell snapcraft-builder"
echo "  2. 建置 Snap: cd ~/MOLi-stalknlock && snapcraft --use-lxd"
echo "  3. 取得檔案: multipass transfer snapcraft-builder:~/MOLi-stalknlock/moli-door_*.snap ."
```

---

## 參考資源

- [Multipass 文件](https://multipass.run/docs)
- [Snapcraft on macOS](https://snapcraft.io/docs/build-on-macos)
- [Docker + Snapcraft](https://snapcraft.io/docs/build-snaps-with-docker)
