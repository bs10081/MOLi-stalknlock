import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CreditCard, FileText, TrendingUp } from 'lucide-react'

export const OverviewPage: React.FC = () => {
  // Mock data
  const stats = [
    {
      title: '總使用者數',
      value: '24',
      change: '+2 本月',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: '綁定卡片',
      value: '45',
      change: '+5 本月',
      icon: CreditCard,
      color: 'text-green-600'
    },
    {
      title: '本月存取',
      value: '1,234',
      change: '+12% vs 上月',
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      title: '活躍使用者',
      value: '18',
      change: '本週',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ]

  return (
    <div>
      <PageHeader
        title="總覽"
        description="MOLi 門禁系統使用統計"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">{stat.title}</p>
                    <p className="text-3xl font-semibold text-text-primary">{stat.value}</p>
                    <p className="text-xs text-text-secondary mt-2">{stat.change}</p>
                  </div>
                  <div className={`p-3 bg-gray-50 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近存取記錄</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">張三</p>
                    <p className="text-xs text-text-secondary">卡片 **** 1234</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">今天 10:{i}0</p>
                    <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      成功
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系統狀態</CardTitle>
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
                <span className="text-sm font-medium text-success">正常</span>
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
