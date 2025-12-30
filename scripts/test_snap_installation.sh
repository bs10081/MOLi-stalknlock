#!/bin/bash
# test_snap_installation.sh
# Ubuntu Core 上的 MOLi 門禁系統測試腳本

set -e

echo "========================================="
echo "MOLi Door Snap 安裝驗證測試"
echo "========================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# 測試函式
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAIL++))
    fi
    echo ""
}

# 1. 檢查 snap 安裝狀態
echo "[1/10] 檢查 snap 安裝狀態..."
if snap list | grep -q "moli-door"; then
    VERSION=$(snap list | grep moli-door | awk '{print $2}')
    echo "版本: $VERSION"
    test_result 0 "moli-door snap 已安裝"
else
    test_result 1 "moli-door snap 未安裝"
    echo "請執行: sudo snap install moli-door_*.snap --dangerous"
    exit 1
fi

# 2. 檢查服務狀態
echo "[2/10] 檢查服務狀態..."
if snap services moli-door | grep -q "active"; then
    test_result 0 "moli-door 服務運行中"
else
    test_result 1 "moli-door 服務未運行"
    echo "嘗試啟動: sudo snap start moli-door"
fi

# 3. 檢查 interface 連接
echo "[3/10] 檢查 interface 連接..."

# network
if snap connections moli-door | grep -q "network.*:network"; then
    test_result 0 "network interface 已連接"
else
    test_result 1 "network interface 未連接"
fi

# network-bind
if snap connections moli-door | grep -q "network-bind.*:network-bind"; then
    test_result 0 "network-bind interface 已連接"
else
    test_result 1 "network-bind interface 未連接"
fi

# raw-input
if snap connections moli-door | grep -q "raw-input"; then
    if snap connections moli-door | grep -q "raw-input.*-$"; then
        echo -e "${YELLOW}⚠ WARNING${NC}: raw-input interface 已宣告但未連接"
        echo "執行: sudo snap connect moli-door:raw-input"
        ((FAIL++))
    else
        test_result 0 "raw-input interface 已連接"
    fi
else
    test_result 1 "raw-input interface 未宣告"
fi

# gpio-chardev
if snap connections moli-door | grep -q "gpio-chardev"; then
    if snap connections moli-door | grep -q "gpio-chardev.*-$"; then
        echo -e "${YELLOW}⚠ WARNING${NC}: gpio-chardev interface 已宣告但未連接"
        echo "執行: sudo snap connect moli-door:gpio-chardev pi:gpio-chardev"
        ((FAIL++))
    else
        test_result 0 "gpio-chardev interface 已連接"
    fi
else
    test_result 1 "gpio-chardev interface 未宣告"
fi

# 4. 檢查 Web 服務
echo "[4/10] 檢查 Web 服務..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    test_result 0 "Web 服務回應正常 (HTTP $HTTP_CODE)"
else
    test_result 1 "Web 服務無回應 (HTTP $HTTP_CODE)"
fi

# 5. 檢查資料庫
echo "[5/10] 檢查資料庫..."
if [ -f /var/snap/moli-door/common/moli_door.db ]; then
    SIZE=$(stat -f%z /var/snap/moli-door/common/moli_door.db 2>/dev/null || stat -c%s /var/snap/moli-door/common/moli_door.db)
    echo "資料庫大小: $SIZE bytes"
    test_result 0 "資料庫檔案存在"
else
    test_result 1 "資料庫檔案不存在"
fi

# 6. 檢查 GPIO 裝置
echo "[6/10] 檢查 GPIO 裝置..."
if [ -e /dev/gpiochip0 ]; then
    test_result 0 "GPIO 裝置存在 (/dev/gpiochip0)"
else
    test_result 1 "GPIO 裝置不存在"
fi

# 7. 檢查 RFID 輸入裝置
echo "[7/10] 檢查 RFID 輸入裝置..."
RFID_COUNT=$(ls /dev/input/by-id/ 2>/dev/null | grep -i "sycreader\|rfid" | wc -l)
if [ "$RFID_COUNT" -gt 0 ]; then
    echo "找到 $RFID_COUNT 個 RFID 裝置:"
    ls /dev/input/by-id/ | grep -i "sycreader\|rfid"
    test_result 0 "RFID 裝置已連接"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: 未偵測到 RFID 裝置"
    echo "請確認 USB RFID 讀卡機已連接"
    ((FAIL++))
fi

# 8. 檢查應用程式日誌
echo "[8/10] 檢查應用程式日誌 (最近 10 行)..."
if journalctl -u snap.moli-door.moli-door -n 10 --no-pager 2>/dev/null | grep -q "INFO"; then
    journalctl -u snap.moli-door.moli-door -n 10 --no-pager 2>/dev/null | tail -5
    test_result 0 "應用程式日誌正常"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: 無法讀取日誌或日誌異常"
    ((FAIL++))
fi

# 9. 檢查環境變數檔案
echo "[9/10] 檢查環境變數..."
if [ -f /var/snap/moli-door/common/.env ]; then
    test_result 0 "環境變數檔案存在"

    # 檢查必要變數
    REQUIRED_VARS=("LOCK_PIN" "BOT_TOKEN" "TG_CHAT_ID")
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$VAR=" /var/snap/moli-door/common/.env; then
            echo "  ✓ $VAR 已設定"
        else
            echo "  ✗ $VAR 未設定"
        fi
    done
else
    echo -e "${YELLOW}⚠ WARNING${NC}: 環境變數檔案不存在"
    echo "建立檔案: sudo nano /var/snap/moli-door/common/.env"
    ((FAIL++))
fi

# 10. 系統資源檢查
echo "[10/10] 檢查系統資源..."
MEM_USAGE=$(snap info moli-door 2>/dev/null | grep "installed:" || echo "N/A")
echo "Snap 狀態: $MEM_USAGE"
test_result 0 "系統資源檢查完成"

# 總結
echo ""
echo "========================================="
echo "測試總結"
echo "========================================="
echo -e "${GREEN}通過: $PASS${NC}"
echo -e "${RED}失敗: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有測試通過！系統運作正常。${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 $FAIL 項測試失敗，請檢查上述訊息。${NC}"
    echo ""
    echo "常見問題排查："
    echo "1. Interface 未連接 → 執行連接指令"
    echo "2. RFID 裝置未偵測 → 確認 USB 連接"
    echo "3. 環境變數未設定 → 編輯 /var/snap/moli-door/common/.env"
    echo "4. 服務未運行 → sudo snap start moli-door"
    echo ""
    echo "查看完整日誌："
    echo "  journalctl -u snap.moli-door.moli-door -n 100"
    exit 1
fi
