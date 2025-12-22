import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <PageWrapper>
      <div className="w-full max-w-4xl space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">歡迎使用 MOLi 門禁系統</CardTitle>
            <p className="text-sm text-text-secondary mt-2">
              Makers' Open Lab for Innovation - 實驗室門禁管理系統
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature Cards */}
              <div className="p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold mb-2">🔐 存取控制</h3>
                <p className="text-sm text-text-secondary">
                  支援 RFID 卡片多卡綁定，靈活的門禁管理
                </p>
              </div>

              <div className="p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold mb-2">👥 用戶管理</h3>
                <p className="text-sm text-text-secondary">
                  完整的用戶資料管理與卡片綁定功能
                </p>
              </div>

              <div className="p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold mb-2">📊 存取記錄</h3>
                <p className="text-sm text-text-secondary">
                  即時查看門禁使用記錄與統計資料
                </p>
              </div>

              <div className="p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold mb-2">🔓 遠程控制</h3>
                <p className="text-sm text-text-secondary">
                  管理員可透過後台進行遠程開門操作
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-3">快速操作</h3>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/login')}
                  className="flex-1"
                >
                  管理員登入
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled
                >
                  註冊新卡片（開發中）
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">系統狀態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-bg-primary rounded-lg">
                <div className="text-2xl font-bold text-success">●</div>
                <div className="text-sm text-text-secondary mt-1">系統運行中</div>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg">
                <div className="text-2xl font-bold text-accent">React</div>
                <div className="text-sm text-text-secondary mt-1">前端框架</div>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg">
                <div className="text-2xl font-bold text-accent">COSS UI</div>
                <div className="text-sm text-text-secondary mt-1">設計系統</div>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg">
                <div className="text-2xl font-bold text-accent">FastAPI</div>
                <div className="text-sm text-text-secondary mt-1">後端 API</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              💡 <strong>展示模式</strong>：目前為前端 UI 展示版本，使用 COSS UI 元件庫打造的 Cloudflare Dashboard 風格界面。
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
