# Ubuntu Core 24 安裝與部署指南

本指南說明如何在樹莓派 3B/4B 上安裝 Ubuntu Core 24 並部署 MOLi 門禁系統。

## 系統需求

### 硬體
- Raspberry Pi 3B 或 4B (需支援 64-bit)
- microSD 卡 (最少 8GB，建議 16GB+，A1/A2 等級)
- USB RFID 讀卡機 (SYC ID IC USB Reader 或相容型號)
- GPIO 繼電器模組 (連接至 BCM GPIO 16)
- 電源供應器 (Pi 4B 使用 USB-C，Pi 3B 使用 micro-USB)
- HDMI 線 + 螢幕（首次設定用）
- USB 鍵盤（首次設定用）
- 有線或 WiFi 網路連線

### 軟體
- Ubuntu Core 24 映像檔 (arm64)
- Ubuntu SSO 帳戶（用於首次登入）
- SSH 金鑰對（需上傳至 Ubuntu One）

---

## Phase 1: 準備 Ubuntu Core 24 映像

### 1.1 下載映像檔

訪問 [Ubuntu Core 下載頁面](https://ubuntu.com/download/raspberry-pi-core)：

```bash
# 下載 Ubuntu Core 24 for Raspberry Pi (64-bit)
wget https://cdimage.ubuntu.com/ubuntu-core/24/stable/current/ubuntu-core-24-arm64+raspi.img.xz
```

### 1.2 燒錄至 SD 卡

**方法 A: 使用 Raspberry Pi Imager (推薦)**
1. 安裝 Raspberry Pi Imager
2. 選擇「Other specific-purpose OS」→「Ubuntu」→「Ubuntu Core 24 (64-bit)」
3. 選擇 SD 卡
4. 燒錄

**方法 B: 使用 dd**
```bash
# 解壓縮
xzcat ubuntu-core-24-arm64+raspi.img.xz | sudo dd of=/dev/sdX bs=32M status=progress

# 同步寫入
sudo sync
```

---

## Phase 2: Ubuntu Core 初始設定

### 2.1 準備 Ubuntu SSO 帳戶

1. 前往 [login.ubuntu.com](https://login.ubuntu.com) 註冊帳戶
2. 產生 SSH 金鑰對（如果尚未有）：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
3. 上傳公鑰至 Ubuntu One：
   - 前往 [launchpad.net/~yourusername/+editsshkeys](https://launchpad.net/~yourusername/+editsshkeys)
   - 貼上 `~/.ssh/id_ed25519.pub` 的內容

### 2.2 首次開機設定

1. 將 SD 卡插入樹莓派
2. 連接 HDMI 螢幕、鍵盤、網路線（建議首次使用有線網路）
3. 開機後等待系統初始化（約 2-5 分鐘）
4. 按照螢幕指示輸入：
   - Ubuntu SSO 帳戶名稱
   - 系統會自動下載您的 SSH 公鑰
5. 設定完成後會顯示 IP 位址

### 2.3 SSH 連線測試

```bash
# 使用 Ubuntu SSO 帳戶名稱連線
ssh <your-ubuntu-sso-id>@<pi-ip-address>

# 檢查系統版本
snap --version
uname -a
```

---

## Phase 3: 建置 Snap 封包

在**開發機器**（非樹莓派）上執行：

### 3.1 安裝 Snapcraft

```bash
# Ubuntu/Debian
sudo snap install snapcraft --classic

# 或使用 LXD 容器建置
sudo snap install lxd
sudo lxd init --auto
```

### 3.2 建置 Snap

```bash
cd /path/to/MOLi-stalknlock

# 建置 arm64 版本（在 x86_64 機器上需使用 --use-lxd）
snapcraft --target-arch=arm64 --use-lxd

# 完成後會產生: moli-door_2.0.0_arm64.snap
```

---

## Phase 4: 部署至 Ubuntu Core

### 4.1 傳輸 Snap 檔案

```bash
# 傳輸 snap 檔案
scp moli-door_2.0.0_arm64.snap <ubuntu-sso-id>@<pi-ip>:~/

# 傳輸環境變數檔案（需先準備）
scp .env.production <ubuntu-sso-id>@<pi-ip>:~/.env
```

### 4.2 安裝 Snap

```bash
# SSH 連線至樹莓派
ssh <ubuntu-sso-id>@<pi-ip>

# 安裝 snap (--dangerous 允許未簽名的 snap)
sudo snap install ~/moli-door_2.0.0_arm64.snap --dangerous

# 檢查安裝狀態
snap list | grep moli-door
```

### 4.3 連接 Interfaces

```bash
# 連接 raw-input (RFID 讀卡機)
sudo snap connect moli-door:raw-input

# 連接 gpio-chardev (GPIO 門鎖)
# 注意：這需要 gadget snap 提供 slot
sudo snap connect moli-door:gpio-chardev pi:gpio-chardev

# 檢查連接狀態
snap connections moli-door
```

**預期輸出範例：**
```
Interface       Plug                     Slot                    Notes
gpio-chardev    moli-door:gpio-chardev   pi:gpio-chardev         -
network         moli-door:network        :network                -
network-bind    moli-door:network-bind   :network-bind           -
raw-input       moli-door:raw-input      :raw-input              -
```

### 4.4 配置環境變數

```bash
# 將環境變數移至 snap 資料目錄
sudo mkdir -p /var/snap/moli-door/common/
sudo cp ~/.env /var/snap/moli-door/common/.env

# 編輯配置（如需調整）
sudo nano /var/snap/moli-door/common/.env
```

**必要的環境變數：**
```bash
DEV_MODE=false
LOCK_PIN=16
LOCK_ACTIVE_LEVEL=1
LOCK_DURATION=3
REGISTER_TIMEOUT=90
BOT_TOKEN=<your-telegram-bot-token>
TG_CHAT_ID=<your-telegram-chat-id>
RFID_DEVICE_PATH=/dev/input/by-id/usb-Sycreader_RFID_Technology_Co.__Ltd_SYC_ID_IC_USB_Reader_*-event-kbd
TZ=Asia/Taipei
```

---

## Phase 5: 驗證與測試

### 5.1 檢查服務狀態

```bash
# 查看服務狀態
snap services moli-door

# 查看即時日誌
journalctl -u snap.moli-door.moli-door -f

# 查看最近 100 行日誌
journalctl -u snap.moli-door.moli-door -n 100
```

### 5.2 測試 Web UI

```bash
# 本地測試
curl http://localhost:8000/

# 遠端測試（從開發機器）
curl http://<pi-ip>:8000/
```

開啟瀏覽器存取：`http://<pi-ip>:8000/dashboard/`

### 5.3 測試硬體

**測試 GPIO：**
```bash
# 檢查 GPIO 裝置
ls -la /dev/gpiochip*

# 查看日誌確認初始化
journalctl -u snap.moli-door.moli-door | grep GPIO
```

**測試 RFID：**
```bash
# 檢查輸入裝置
ls -la /dev/input/by-id/

# 刷卡測試，觀察日誌
journalctl -u snap.moli-door.moli-door -f
```

---

## Phase 6: 維護與更新

### 6.1 更新 Snap

```bash
# 建置新版本
snapcraft --target-arch=arm64 --use-lxd

# 傳輸至樹莓派
scp moli-door_2.1.0_arm64.snap <ubuntu-sso-id>@<pi-ip>:~/

# 更新安裝
sudo snap install ~/moli-door_2.1.0_arm64.snap --dangerous

# snap 會自動重啟服務
```

### 6.2 備份與還原

**備份資料庫：**
```bash
# 備份
sudo cp /var/snap/moli-door/common/moli_door.db ~/moli_door.db.backup

# 下載至本地
scp <ubuntu-sso-id>@<pi-ip>:~/moli_door.db.backup .
```

**還原資料庫：**
```bash
# 上傳備份
scp moli_door.db.backup <ubuntu-sso-id>@<pi-ip>:~/

# 停止服務
sudo snap stop moli-door

# 還原
sudo cp ~/moli_door.db.backup /var/snap/moli-door/common/moli_door.db

# 啟動服務
sudo snap start moli-door
```

### 6.3 移除 Snap

```bash
# 停止並移除
sudo snap remove moli-door

# 清理資料（可選，會刪除資料庫）
sudo rm -rf /var/snap/moli-door/
```

---

## 疑難排解

### 問題 1: gpio-chardev slot 不存在

**症狀：**
```
error: snap "pi" has no plug or slot named "gpio-chardev"
```

**解決方案：**
檢查 gadget snap 版本：
```bash
snap list | grep pi

# 如果需要，更新 gadget snap
sudo snap refresh pi
```

若仍無法使用，改用 `gpio-control` interface (需 devmode)：
```yaml
# snapcraft.yaml
confinement: devmode
plugs:
  - gpio-control
```

### 問題 2: RFID 讀卡機無法讀取

**檢查設備路徑：**
```bash
# 查看所有輸入裝置
ls -la /dev/input/by-id/

# 測試讀取
sudo evtest /dev/input/by-id/usb-Sycreader_*-event-kbd
```

**調整環境變數：**
```bash
sudo nano /var/snap/moli-door/common/.env
# 修改 RFID_DEVICE_PATH 為正確路徑
```

### 問題 3: 無法連接 raw-input

**症狀：**
```
error: snap "moli-door" has no plug named "raw-input"
```

**解決方案：**
確認 snapcraft.yaml 正確宣告：
```yaml
plugs:
  raw-input:
    interface: raw-input
```

重新建置並安裝。

### 問題 4: 服務無法啟動

**查看詳細錯誤：**
```bash
journalctl -u snap.moli-door.moli-door -n 200 --no-pager
```

**常見原因：**
- Python 依賴缺失 → 檢查 requirements-snap.txt
- 路徑問題 → 檢查 layout 配置
- 權限問題 → 檢查 interface 連接狀態

---

## 參考資源

- [Ubuntu Core 文件](https://documentation.ubuntu.com/core/)
- [Snapcraft 文件](https://snapcraft.io/docs)
- [GPIO Interfaces](https://snapcraft.io/docs/gpio-chardev-interface)
- [Raw Input Interface](https://snapcraft.io/docs/raw-input-interface)
- [rpi-lgpio 文件](https://pypi.org/project/rpi-lgpio/)
