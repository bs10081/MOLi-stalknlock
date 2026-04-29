import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, CreditCard, FileText, TrendingUp } from 'lucide-react'
import { adminService, type Stats } from '@/services/adminService'
import type { AccessLog } from '@/types'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatVersionLabel } from '@/lib/version'
import { formatTime } from '@/lib/dateTime'

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { versionInfo } = useAppVersion()

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsData, logsData] = await Promise.all([
        adminService.getStats(),
        adminService.getLogs(),
      ])
      setStats(statsData)
      setRecentLogs(logsData.slice(0, 5))
    } catch (err: any) {
      console.error('Failed to load data:', err)
      setError(err.response?.data?.detail || '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Dashboard"
          title="總覽"
          description="Makers' Open Lab for Innovation 門禁系統使用統計"
        />
        <div className="py-8 text-center text-text-secondary">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          eyebrow="Dashboard"
          title="總覽"
          description="Makers' Open Lab for Innovation 門禁系統使用統計"
        />
        <div className="py-8 text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <Button onClick={loadData}>重試</Button>
        </div>
      </div>
    )
  }

  const statsConfig = [
    {
      title: '總使用者數',
      value: stats?.user_count.toString() || '0',
      change: '已註冊',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: '綁定卡片',
      value: stats?.card_count.toString() || '0',
      change: '張卡片',
      icon: CreditCard,
      color: 'text-green-600',
    },
    {
      title: '本月存取',
      value: stats?.monthly_access_count?.toString() || '0',
      change: '次',
      icon: FileText,
      color: 'text-purple-600',
    },
    {
      title: '活躍使用者',
      value: stats?.active_users_count?.toString() || '0',
      change: '本週',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="總覽"
        description="Makers' Open Lab for Innovation 門禁系統使用統計"
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">Live control surface</Badge>
            <Badge variant="outline">{formatVersionLabel(versionInfo)}</Badge>
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm text-text-secondary">{stat.title}</p>
                    <p className="text-3xl font-semibold text-text-primary">{stat.value}</p>
                    <p className="mt-2 text-xs text-text-secondary">{stat.change}</p>
                  </div>
                  <div className={`rounded-2xl bg-muted/70 p-3 ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近存取記錄</CardTitle>
            <CardDescription>最近幾次有效刷卡與綁定事件會出現在這裡。</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{log.user_name}</p>
                      <p className="text-xs text-text-secondary">
                        卡片 {log.rfid_uid.slice(-8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">
                        {formatTime(log.timestamp)}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        {log.action === 'entry' ? '開門' : '註冊'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-text-secondary">暫無存取記錄</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系統狀態</CardTitle>
            <CardDescription>快速掌握門禁設備與核心服務目前狀態，方便日常巡檢與現場判斷。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">門禁系統</span>
                <span className="text-sm font-medium text-success">運行中</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">RFID 讀卡機</span>
                <span className="text-sm font-medium text-success">正常</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">後端 API</span>
                <span className="text-sm font-medium text-success">v{versionInfo?.version ?? '...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">資料庫</span>
                <span className="text-sm font-medium text-success">正常</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
