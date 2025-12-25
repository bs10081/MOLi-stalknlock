# MOLi-stalknlock 開發規範

## 程式碼傳輸

**優先使用 Git 進行程式碼同步**

1. 提交變更到 Git 倉庫
2. 在樹莓派上執行 `git pull`
3. 重新建置或重啟容器

## Docker 部署工作流程

### 本地建置（推薦）

使用 Docker Buildx 在本地建置 ARM64 映像檔：

```bash
# 設置 buildx builder（首次）
docker buildx create --use --name multiarch

# 建置並推送 ARM64 映像檔
docker buildx build --platform linux/arm64 -t bs10081/moli-door:dev --push .
```

### 樹莓派部署

```bash
# 拉取最新映像檔並重啟
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose pull && docker compose up -d"
```

### 樹莓派本地建置（備用）

僅在無法使用 Docker Hub 時使用：

```bash
ssh moli-door "cd /home/pi/Host/MOLi-stalknlock && docker compose build && docker compose up -d"
```

## 開發伺服器

### 前端開發
```bash
cd frontend && npm run dev
```

### 後端開發
```bash
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 專案結構

- `app/` - FastAPI 後端
- `frontend/` - React + TypeScript 前端
- `templates/` - Jinja2 模板
- `static/` - 靜態資源
