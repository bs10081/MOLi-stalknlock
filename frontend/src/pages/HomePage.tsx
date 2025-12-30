import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Users, Clock, Unlock, ChevronRight } from 'lucide-react'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: Shield,
      title: '存取控制',
      description: '支援 RFID 卡片多卡綁定，靈活的門禁管理'
    },
    {
      icon: Users,
      title: '使用者管理',
      description: '完整的使用者資料管理與卡片綁定功能'
    },
    {
      icon: Clock,
      title: '存取記錄',
      description: '即時查看門禁使用記錄與統計資料'
    },
    {
      icon: Unlock,
      title: '遠程控制',
      description: '管理員可透過後台進行遠程開門操作'
    }
  ]

  return (
    <PageWrapper>
      <div className="w-full max-w-5xl space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            MOLi 門禁系統
          </h1>
          <p className="text-text-secondary">
            Makers' Open Lab for Innovation - 實驗室門禁管理系統
          </p>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/login')}
                className="gap-2"
              >
                管理員登入
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="hover:bg-gray-50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-text-secondary">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">系統狀態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-sm font-medium">運行中</div>
                <div className="text-xs text-text-secondary mt-1">系統正常</div>
              </div>
              <div className="text-center p-4">
                <div className="text-lg font-semibold text-accent mb-2">React</div>
                <div className="text-sm text-text-secondary">前端框架</div>
              </div>
              <div className="text-center p-4">
                <div className="text-lg font-semibold text-accent mb-2">COSS UI</div>
                <div className="text-sm text-text-secondary">設計系統</div>
              </div>
              <div className="text-center p-4">
                <div className="text-lg font-semibold text-accent mb-2">FastAPI</div>
                <div className="text-sm text-text-secondary">後端 API</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>展示模式</strong>：目前為前端 UI 展示版本，使用 COSS UI 元件庫打造的 Cloudflare Dashboard 風格界面。
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
