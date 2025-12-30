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
if ! command -v multipass &> /dev/null; then
    brew install --cask multipass
else
    echo "✓ Multipass 已安裝"
fi

# 等待 Multipass 啟動
sleep 2

# 啟動 VM
echo "🚀 建立 Ubuntu VM..."
if multipass list | grep -q "snapcraft-builder"; then
    echo "✓ VM 已存在"
else
    multipass launch 24.04 --name snapcraft-builder --memory 4G --disk 20G --cpus 2
fi

# 設定 VM
echo "⚙️  配置 VM..."
multipass exec snapcraft-builder -- bash -c '
    sudo apt update -qq
    sudo snap install snapcraft --classic 2>/dev/null || echo "✓ snapcraft 已安裝"
    sudo snap install lxd 2>/dev/null || echo "✓ lxd 已安裝"
    sudo lxd init --auto 2>/dev/null || true
    sudo usermod -a -G lxd ubuntu
'

# 掛載專案
echo "📂 掛載專案目錄..."
PROJECT_DIR="$(pwd)"
if multipass info snapcraft-builder | grep -q "MOLi-stalknlock"; then
    echo "✓ 專案已掛載"
else
    multipass mount "$PROJECT_DIR" snapcraft-builder:/home/ubuntu/MOLi-stalknlock
fi

echo ""
echo "✅ 設置完成！"
echo ""
echo "下一步："
echo "  1. 進入 VM:"
echo "     multipass shell snapcraft-builder"
echo ""
echo "  2. 建置 Snap:"
echo "     cd ~/MOLi-stalknlock"
echo "     snapcraft --use-lxd"
echo ""
echo "  3. 取得建置結果:"
echo "     exit  # 離開 VM"
echo "     multipass transfer snapcraft-builder:~/MOLi-stalknlock/moli-door_*.snap ."
echo ""
echo "  4. 清理 VM (可選):"
echo "     multipass delete snapcraft-builder"
echo "     multipass purge"
