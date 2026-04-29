import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatBuiltAt, formatVersionLabel } from '@/lib/version'

export const SettingsPage: React.FC = () => {
  const { versionInfo } = useAppVersion()

  const configSources = [
    {
      title: '部署環境設定',
      description: '系統的安全與設備基礎設定，會在部署時一併安排妥當，讓現場使用更穩定。',
      badge: '環境變數',
    },
    {
      title: '後端服務狀態',
      description: '這裡會整理目前的系統運作方式與維護分工，方便你快速掌握現場狀態。',
      badge: '唯讀',
    },
    {
      title: '維護操作',
      description: '遇到備份、清理或重新啟動等需求時，建議依照既有維運流程處理，讓服務更安心。',
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
        eyebrow="系統資訊"
        title="系統設定"
        description="查看目前系統版本、設定來源與維護方式說明"
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">資訊頁面</Badge>
            <Badge variant="outline">{formatVersionLabel(versionInfo)}</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        <Card variant="hero">
          <CardHeader>
            <CardTitle>版本資訊</CardTitle>
            <CardDescription>這裡會顯示目前部署中的版本資訊，方便你確認現場系統是否已更新到預期版本。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Version</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{versionInfo?.version ? `v${versionInfo.version}` : 'Unavailable'}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Git SHA</p>
              <p className="mt-2 font-mono text-lg font-semibold text-text-primary">{versionInfo?.git_sha?.slice(0, 12) ?? 'Unavailable'}</p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Built At</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{formatBuiltAt(versionInfo?.built_at) ?? 'Unavailable'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>設定管理方式</CardTitle>
            <CardDescription>這一頁主要整理設定來源與維護分工，方便日常交接與排查。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {configSources.map((item) => (
                <div key={item.title} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
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
            <CardDescription>這些項目通常會跟著部署環境與主機設定一起維護，不在這個頁面直接調整。</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-text-secondary">
              {managedItems.map((item) => (
                <li key={item} className="rounded-lg border border-border bg-muted/55 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="rounded-[24px] border border-border bg-muted/55 p-4 text-sm text-text-secondary">
          這個頁面以說明與確認現況為主，讓你能更快掌握系統版本與維護方式。
        </div>
      </div>
    </div>
  )
}
