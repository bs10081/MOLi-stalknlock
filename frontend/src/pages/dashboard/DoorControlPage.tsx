import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DoorOpen, Lock, AlertCircle } from 'lucide-react'

export const DoorControlPage: React.FC = () => {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [doorStatus, setDoorStatus] = useState<'locked' | 'unlocked'>('locked')

  const handleUnlock = async () => {
    setIsUnlocking(true)
    // 模擬開門動作
    await new Promise(resolve => setTimeout(resolve, 2000))
    setDoorStatus('unlocked')
    setIsUnlocking(false)

    // 5 秒後自動上鎖
    setTimeout(() => {
      setDoorStatus('locked')
    }, 5000)
  }

  return (
    <div>
      <PageHeader
        title="門禁控制"
        description="遠程控制實驗室門鎖"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Door Control Card */}
        <Card className="order-1">
          <CardHeader>
            <CardTitle>遠程開門</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              {/* Door Icon */}
              <div className={`inline-flex p-6 rounded-full mb-6 ${
                doorStatus === 'locked' ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {doorStatus === 'locked' ? (
                  <Lock className={`w-16 h-16 ${doorStatus === 'locked' ? 'text-red-600' : 'text-green-600'}`} />
                ) : (
                  <DoorOpen className="w-16 h-16 text-green-600" />
                )}
              </div>

              {/* Status */}
              <div className="mb-6">
                <p className="text-2xl font-semibold mb-2">
                  {doorStatus === 'locked' ? '門已上鎖' : '門已解鎖'}
                </p>
                <p className="text-sm text-text-secondary">
                  {doorStatus === 'unlocked' && '將在 5 秒後自動上鎖'}
                </p>
              </div>

              {/* Unlock Button */}
              <Button
                size="lg"
                onClick={handleUnlock}
                disabled={isUnlocking || doorStatus === 'unlocked'}
                className="gap-2"
              >
                <DoorOpen className="w-5 h-5" />
                {isUnlocking ? '開門中...' : '遠程開門'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Warning Card - Shows second on mobile, third on desktop */}
        <Card className="order-2 lg:order-3 lg:col-span-2 bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 mb-1">安全提醒</p>
                <p className="text-sm text-yellow-800">
                  遠程開門功能僅供緊急情況使用。請確保在使用此功能時，實驗室有人員在場。所有遠程開門操作都會被記錄。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Access Card - Shows third on mobile, second on desktop */}
        <Card className="order-3 lg:order-2">
          <CardHeader>
            <CardTitle>最近存取</CardTitle>
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
      </div>
    </div>
  )
}
