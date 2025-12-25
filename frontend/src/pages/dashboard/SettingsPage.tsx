import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export const SettingsPage: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="系統設定"
        description="管理門禁系統的各項設定"
      />

      <div className="space-y-6">
        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>系統資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium">系統版本</p>
                  <p className="text-sm text-text-secondary">當前系統版本號</p>
                </div>
                <Badge variant="info">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium">資料庫狀態</p>
                  <p className="text-sm text-text-secondary">PostgreSQL 連線狀態</p>
                </div>
                <Badge variant="success">正常</Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">RFID 讀卡機</p>
                  <p className="text-sm text-text-secondary">硬體連線狀態</p>
                </div>
                <Badge variant="success">已連線</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>系統設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  系統名稱
                </label>
                <Input defaultValue="MOLi 門禁系統" />
                <p className="text-xs text-text-secondary mt-1">顯示在登入頁和導覽列的系統名稱</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  自動上鎖時間（秒）
                </label>
                <Input type="number" defaultValue="5" />
                <p className="text-xs text-text-secondary mt-1">門鎖開啟後自動上鎖的時間</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Telegram Bot Token
                </label>
                <Input type="password" defaultValue="**********************" />
                <p className="text-xs text-text-secondary mt-1">用於通知的 Telegram Bot Token</p>
              </div>

              <div className="pt-4">
                <Button>儲存設定</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle>維護功能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium">清理存取記錄</p>
                  <p className="text-sm text-text-secondary">刪除 90 天前的存取記錄</p>
                </div>
                <Button variant="secondary" size="sm">執行清理</Button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium">重啟系統服務</p>
                  <p className="text-sm text-text-secondary">重新啟動門禁控制服務</p>
                </div>
                <Button variant="secondary" size="sm">重啟服務</Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">備份資料庫</p>
                  <p className="text-sm text-text-secondary">建立資料庫完整備份</p>
                </div>
                <Button variant="secondary" size="sm">立即備份</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
