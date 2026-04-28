import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const SettingsPage: React.FC = () => {
  const configSources = [
    {
      title: '部署環境設定',
      description: 'JWT、資料庫、GPIO、速率限制與 Cookie 行為目前由環境變數與部署設定管理。',
      badge: '環境變數',
    },
    {
      title: '後端服務狀態',
      description: '管理介面尚未提供可寫入的系統設定 API，因此畫面不會假裝修改實際運行中的服務。',
      badge: '唯讀',
    },
    {
      title: '維護操作',
      description: '備份、清理與服務重啟仍應透過伺服器命令、Docker 或部署腳本執行。',
      badge: '手動操作',
    },
  ]

  const managedItems = [
    'JWT_SECRET_KEY、COOKIE_SECURE、RATE_LIMIT_* 由後端環境變數決定',
    'DATABASE_URL 與資料庫備份策略由部署環境管理',
    'LOCK_DURATION、GPIO 腳位與 RFID 裝置路徑由系統配置管理',
  ]

  return (
    <div>
      <PageHeader
        title="系統設定"
        description="查看目前可公開說明的系統設定方式與維護邊界"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>設定管理方式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {configSources.map((item) => (
                <div key={item.title} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                  </div>
                  <Badge variant="info">{item.badge}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>目前由部署管理的項目</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-text-secondary">
              {managedItems.map((item) => (
                <li key={item} className="rounded-lg border border-border bg-gray-50 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          這個頁面目前是資訊頁，不會直接修改系統設定，也不會偽裝成可執行的維護控制台。
        </div>
      </div>
    </div>
  )
}
