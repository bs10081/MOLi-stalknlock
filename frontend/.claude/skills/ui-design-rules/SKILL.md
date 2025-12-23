---
name: ui-design-rules
description: MOLi 門禁系統 UI 設計規範，採用 Cloudflare Dashboard 風格和 COSS UI 組件庫。用於創建 UI 組件、設計界面、審查設計一致性或進行樣式調整時使用。
allowed-tools: Read, Grep, Glob, Edit, Write
---

# MOLi 門禁系統 UI 設計規範

## 設計系統概述

本專案採用 **Cloudflare Dashboard** 風格的設計系統，使用 **COSS UI** 組件庫，強調專業、簡潔、易用的界面設計。

## 核心設計原則

### 1. 專業而非花俏
- ❌ **禁止**使用浮動陰影（floating shadows）等廉價效果
- ❌ **禁止**使用 emoji 圖示（除非使用者明確要求）
- ✅ 使用背景色變化 (`bg-gray-50`, `bg-gray-100`) 而非陰影來表達層次
- ✅ 保持簡潔、專業的視覺風格
- ✅ 使用 Lucide React 圖示庫（16-20px）

### 2. 本地化用詞（台灣繁體中文）
- ✅ 使用「**使用者**」而非「用戶」
- ✅ 使用「**信箱**」而非「郵箱」或「電子郵件」
- ✅ 使用「**綁定**」而非「綁定」
- ✅ 所有文字一律使用台灣慣用詞彙

### 3. 響應式設計
- `lg` (1024px) 以上：Sidebar 固定顯示
- `lg` 以下：Sidebar 隱藏，使用 Sheet 組件從左側滑入
- 移動端使用 hamburger menu

---

## 顏色系統

### 語意化顏色（使用 Tailwind CSS 變數）
```css
/* 文字顏色 */
--text-primary: #1f2937      /* 主要文字 */
--text-secondary: #6b7280    /* 次要文字 */
--text-tertiary: #9ca3af     /* 輔助文字 */

/* 品牌色 */
--accent: #0066cc            /* 強調色（藍色）*/

/* 背景色 */
--bg-primary: #ffffff        /* 主要背景 */
--bg-secondary: #f5f7fa      /* 次要背景（淺灰）*/
--bg-tertiary: #f9fafb       /* 第三層背景 */

/* 邊框 */
--border: #e5e7eb            /* 邊框顏色 */

/* 狀態顏色 */
--success: #10b981           /* 成功（綠色）*/
--error: #ef4444             /* 錯誤（紅色）*/
--warning: #f59e0b           /* 警告（橙色）*/
--info: #3b82f6              /* 資訊（藍色）*/
```

### Hover 效果
- 使用 `hover:bg-gray-50` 或 `hover:bg-gray-100`
- **不使用** `hover:shadow-lg` 等陰影效果
- 過渡動畫：`transition-colors`

---

## 佈局架構

### Sidebar（左側導航）
- **寬度**：240px (`w-60`)
- **背景**：白色 (`bg-white`)
- **邊框**：右側邊框 (`border-r border-border`)
- **高度**：全螢幕 (`h-screen`)
- **固定定位**：桌面版 `lg:static`，移動版 `fixed`

### 導航項目
```tsx
// 一般狀態
className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
           transition-colors hover:bg-gray-50
           text-text-secondary font-normal"

// 選中狀態
className="bg-gray-100 text-text-primary font-medium"
```

### 可展開的子選單
- 父項目右側顯示 `ChevronDown` / `ChevronRight` 圖示
- 子項目使用左側灰色邊框 (`border-l-2 border-gray-200`) 表達層級
- 子項目縮排：`ml-3 pl-3`
- 子項目圖示較小：`w-4 h-4`（父項目為 `w-5 h-5`）

### 主內容區域
- 使用 flexbox 佈局：`flex-1 flex flex-col`
- 內邊距：`p-6`
- 最大寬度：`max-w-full` 或根據內容調整

---

## COSS UI 組件使用規範

### Button 按鈕
參考：`https://coss.com/ui/docs/components/button`

**變體（Variants）**：
- `default`：主要按鈕（藍色背景）
- `secondary`：次要按鈕（灰色背景）
- `outline`：邊框按鈕
- `ghost`：幽靈按鈕（無背景）
- `danger`：危險操作（紅色）

**尺寸（Sizes）**：
- `sm`：小型按鈕
- `md`：中型按鈕（預設）
- `lg`：大型按鈕

**使用範例**：
```tsx
<Button variant="default" className="gap-2">
  <Plus className="w-4 h-4" />
  新增使用者
</Button>

<Button variant="secondary" size="sm" className="gap-2">
  <Edit className="w-3 h-3" />
  編輯
</Button>
```

### Card 卡片
參考：`https://coss.com/ui/docs/components/card`

**組件組成**：
- `Card`：外層容器
- `CardHeader`：標題區域
- `CardTitle`：標題文字
- `CardDescription`：描述文字（可選）
- `CardContent`：內容區域
- `CardFooter`：底部區域（可選）

**使用範例**：
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-xl font-semibold">使用者列表</CardTitle>
    <p className="text-sm text-text-secondary mt-1">
      管理使用者資料與卡片綁定
    </p>
  </CardHeader>
  <CardContent>
    {/* 內容 */}
  </CardContent>
</Card>
```

### Table 表格
參考：`https://coss.com/ui/docs/components/table`

**組件組成**：
- `Table`：外層容器
- `TableHeader`：表頭
- `TableBody`：表格主體
- `TableRow`：表格列
- `TableHead`：表頭單元格
- `TableCell`：表格單元格

**使用範例**：
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>姓名</TableHead>
      <TableHead>信箱</TableHead>
      <TableHead className="text-right">操作</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">張三</TableCell>
      <TableCell>zhang@example.com</TableCell>
      <TableCell className="text-right">
        <Button variant="secondary" size="sm">編輯</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Tabs 標籤頁
參考：`https://coss.com/ui/docs/components/tabs`

**變體**：
- `default`：預設樣式
- `underline`：下劃線樣式（**推薦用於導航**）

**使用範例**：
```tsx
<Tabs defaultValue="users" variant="underline">
  <TabsList>
    <TabsTrigger value="users">使用者管理</TabsTrigger>
    <TabsTrigger value="admins">管理員</TabsTrigger>
  </TabsList>
  <TabsContent value="users">
    {/* 使用者內容 */}
  </TabsContent>
</Tabs>
```

### Badge 徽章
參考：`https://coss.com/ui/docs/components/badge`

**變體**：
- `default`：預設樣式
- `success`：成功狀態（綠色）
- `error`：錯誤狀態（紅色）
- `warning`：警告狀態（黃色）
- `info`：資訊狀態（藍色）
- `outline`：邊框樣式
- `secondary`：次要樣式

**使用範例**：
```tsx
<Badge variant="success" size="sm">啟用</Badge>
<Badge variant="error" size="sm">失敗</Badge>
```

### Input 輸入框
**搜尋輸入框**（帶圖示）：
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2
                     w-4 h-4 text-text-secondary" />
  <Input
    placeholder="搜尋使用者名稱或信箱..."
    className="pl-10"
  />
</div>
```

---

## 間距系統

使用 Tailwind CSS 的間距 scale（基於 4px）：

| Class | 值 | 用途 |
|-------|-----|------|
| `p-1` | 4px | 極小內邊距 |
| `p-2` | 8px | 小內邊距 |
| `p-3` | 12px | 中內邊距 |
| `p-4` | 16px | 常用內邊距 |
| `p-6` | 24px | 大內邊距 |
| `p-8` | 32px | 特大內邊距 |

**常用組合**：
- 導航項目：`px-3 py-2.5`
- 卡片內容：`p-6` 或 `pt-6`
- 按鈕內邊距：`px-4 py-2`（中型）、`px-3 py-1.5`（小型）

---

## 字體系統

### 字體家族
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

### 字體大小
| 用途 | Class | 大小 |
|------|-------|------|
| 頁面標題 | `text-3xl` | 30px |
| 卡片標題 | `text-xl` | 20px |
| 副標題 | `text-lg` | 18px |
| 正文 | `text-sm` | 14px |
| 小字 | `text-xs` | 12px |

### 字體粗細
- 標題：`font-semibold` (600) 或 `font-bold` (700)
- 強調文字：`font-medium` (500)
- 正文：`font-normal` (400)

---

## 頁面結構範本

### PageHeader 組件
```tsx
<PageHeader
  title="使用者管理"
  description="管理使用者資料與卡片綁定"
  actions={
    <Button className="gap-2">
      <Plus className="w-4 h-4" />
      新增使用者
    </Button>
  }
/>
```

### 完整頁面結構
```tsx
export const ExamplePage: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="頁面標題"
        description="頁面描述"
        actions={<Button>操作按鈕</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          {/* 搜尋區域 */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2
                                 w-4 h-4 text-text-secondary" />
              <Input placeholder="搜尋..." className="pl-10" />
            </div>
          </div>

          {/* 表格 */}
          <Table>
            {/* 表格內容 */}
          </Table>

          {/* 分頁資訊 */}
          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-10 筆，共 100 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 圖示使用規範

### Lucide React
- 所有圖示使用 `lucide-react` 庫
- 標準大小：`w-4 h-4` 或 `w-5 h-5`
- 顏色跟隨文字色：`text-text-primary` / `text-text-secondary`

**常用圖示**：
- `Home`：首頁/總覽
- `Users`：使用者
- `CreditCard`：卡片
- `FileText`：記錄/日誌
- `Shield`：管理員/安全
- `DoorOpen`：門禁
- `Settings`：設定
- `Search`：搜尋
- `Plus`：新增
- `Edit`：編輯
- `Trash2`：刪除
- `ChevronDown` / `ChevronRight`：展開/收合
- `ArrowLeft`：返回

---

## 狀態表示

### 成功狀態
```tsx
<Badge variant="success" size="sm">成功</Badge>
<Badge variant="success" size="sm">啟用</Badge>
<span className="text-sm font-medium text-success">運行中</span>
```

### 錯誤/失敗狀態
```tsx
<Badge variant="error" size="sm">失敗</Badge>
<Badge variant="error" size="sm">停用</Badge>
```

### 警告狀態
```tsx
<Badge variant="warning" size="sm">警告</Badge>
```

---

## 最佳實踐

### ✅ 應該做的
1. 使用語意化的顏色變數（`text-text-primary` 而非 `text-gray-900`）
2. 保持一致的間距和圓角半徑
3. 使用過渡動畫提升使用者體驗（`transition-colors`）
4. 確保所有互動元素都有 hover 狀態
5. 提供清晰的視覺回饋（選中狀態、載入狀態等）
6. 遵循台灣本地化用詞
7. 所有文字使用繁體中文（台灣）

### ❌ 不應該做的
1. 不使用浮動陰影（`shadow-lg`、`shadow-xl`）
2. 不使用 emoji 作為圖示
3. 不使用過於花俏的動畫效果
4. 不混用中國用詞和台灣用詞
5. 不建立未經使用者要求的文檔檔案
6. 不過度設計簡單功能

---

## 無障礙設計（Accessibility）

1. **顏色對比**：確保文字與背景有足夠對比度（WCAG AA 標準）
2. **鍵盤導航**：所有互動元素可用鍵盤操作
3. **語意化 HTML**：使用正確的 HTML 標籤（`<button>`, `<nav>`, `<main>` 等）
4. **ARIA 屬性**：必要時添加 ARIA 標籤

---

## 範例場景

### 場景 1：建立新的管理頁面
當使用者要求建立新頁面時：
1. 使用 `PageHeader` 組件設定標題和描述
2. 使用 `Card` 組件包裝內容區域
3. 如需表格，使用 COSS UI 的 `Table` 組件
4. 操作按鈕使用正確的變體和尺寸
5. 確保所有文字使用台灣用詞

### 場景 2：審查現有 UI
檢查項目：
- [ ] 是否有不必要的陰影效果？
- [ ] 文字是否使用台灣用詞（「使用者」而非「用戶」）？
- [ ] Hover 效果是否使用背景色變化？
- [ ] 圖示是否來自 Lucide React？
- [ ] 間距是否一致？
- [ ] 顏色是否使用語意化變數？

### 場景 3：新增互動元素
1. 確保有明確的 hover 狀態
2. 使用 `transition-colors` 過渡
3. 選中狀態使用 `bg-gray-100` 和 `font-medium`
4. 提供視覺回饋（loading、disabled 狀態等）

---

## 檔案位置參考

- 佈局組件：`/src/components/layout/`
  - `Sidebar.tsx`：側邊欄導航
  - `DashboardLayout.tsx`：Dashboard 佈局
  - `PageHeader.tsx`：頁面標題

- UI 組件：`/src/components/ui/`
  - `button.tsx`、`card.tsx`、`input.tsx`
  - `table.tsx`、`tabs.tsx`、`badge.tsx`

- 配置：`/src/config/navigation.ts`
  - 導航結構定義

- 樣式：`/src/index.css`
  - Tailwind CSS 配置和自訂樣式

---

## 總結

遵循這些規範可以確保：
- ✅ 專業、一致的視覺風格（Cloudflare Dashboard）
- ✅ 優秀的使用者體驗
- ✅ 易於維護和擴展
- ✅ 符合台灣使用者習慣
- ✅ 無障礙友好

當需要建立新的 UI 元素或修改現有介面時，請參考本規範並使用 COSS UI 組件庫。
