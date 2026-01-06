import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DoorOpen, Lock, AlertCircle, Plus, Trash2, Key, User } from 'lucide-react'
import { adminService } from '@/services/adminService'
import type { AccessLog, AdminCard } from '@/types'

export const DoorControlPage: React.FC = () => {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [doorStatus, setDoorStatus] = useState<'locked' | 'unlocked'>('locked')
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([])
  const [error, setError] = useState<string | null>(null)

  // 鎖門模式狀態
  const [lockMode, setLockMode] = useState<boolean>(false)
  const [isTogglingMode, setIsTogglingMode] = useState(false)

  // 管理卡狀態
  const [adminCards, setAdminCards] = useState<AdminCard[]>([])
  const [isLoadingCards, setIsLoadingCards] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      loadRecentLogs(),
      loadDoorStatus(),
      loadAdminCards()
    ])
  }

  const loadRecentLogs = async () => {
    try {
      const logs = await adminService.getLogs()
      setRecentLogs(logs.slice(0, 5))
    } catch (err) {
      console.error('Failed to load recent logs:', err)
    }
  }

  const loadDoorStatus = async () => {
    try {
      const status = await adminService.getDoorStatus()
      setDoorStatus(status.is_locked ? 'locked' : 'unlocked')
      setLockMode(status.lock_mode.always_lock)
    } catch (err) {
      console.error('Failed to load door status:', err)
    }
  }

  const loadAdminCards = async () => {
    setIsLoadingCards(true)
    try {
      const cards = await adminService.getAdminCards()
      setAdminCards(cards)
    } catch (err) {
      console.error('Failed to load admin cards:', err)
    } finally {
      setIsLoadingCards(false)
    }
  }

  const handleUnlock = async () => {
    try {
      setIsUnlocking(true)
      setError(null)
      await adminService.unlockDoor()
      setDoorStatus('unlocked')

      setTimeout(() => {
        setDoorStatus('locked')
      }, 5000)

      await loadRecentLogs()
    } catch (err: any) {
      console.error('Failed to unlock door:', err)
      setError(err.response?.data?.detail || '遠程開門失敗')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleToggleLockMode = async (newMode: boolean) => {
    setIsTogglingMode(true)
    try {
      await adminService.setLockMode(newMode)
      setLockMode(newMode)
      await loadDoorStatus()
    } catch (err: any) {
      console.error('Failed to toggle lock mode:', err)
      setError(err.response?.data?.detail || '切換鎖門模式失敗')
    } finally {
      setIsTogglingMode(false)
    }
  }

  const handleDeleteAdminCard = async (cardId: string) => {
    if (!confirm('確定要刪除此管理卡嗎？')) return

    try {
      await adminService.deleteAdminCard(cardId)
      await loadAdminCards()
    } catch (err: any) {
      console.error('Failed to delete admin card:', err)
      alert(err.response?.data?.detail || '刪除管理卡失敗')
    }
  }

  const handleAddAdminCard = () => {
    // TODO: 實作新增管理卡對話框
    alert('新增管理卡功能開發中...')
  }

  return (
    <div>
      <PageHeader
        title="門禁控制"
        description="遠程控制實驗室門鎖與管理卡片"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 遠程開門卡片 */}
        <Card className="order-1">
          <CardHeader>
            <CardTitle>遠程開門</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className={`inline-flex p-6 rounded-full mb-6 ${
                doorStatus === 'locked' ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {doorStatus === 'locked' ? (
                  <Lock className="w-16 h-16 text-red-600" />
                ) : (
                  <DoorOpen className="w-16 h-16 text-green-600" />
                )}
              </div>

              <div className="mb-6">
                <p className="text-2xl font-semibold mb-2">
                  {doorStatus === 'locked' ? '門已上鎖' : '門已解鎖'}
                </p>
                <p className="text-sm text-text-secondary">
                  {doorStatus === 'unlocked' && '將在 5 秒後自動上鎖'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

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

        {/* 鎖門模式控制卡片 */}
        <Card className="order-2">
          <CardHeader>
            <CardTitle>鎖門模式控制</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <p className="font-medium mb-1">Always Lock Mode</p>
                  <p className="text-sm text-text-secondary">
                    {lockMode ? '每次刷卡後自動鎖回' : '第一次刷卡後保持解鎖'}
                  </p>
                </div>
                <Switch
                  checked={lockMode}
                  onChange={handleToggleLockMode}
                  disabled={isTogglingMode}
                  size="lg"
                />
              </div>

              <div className="text-sm">
                <p className="text-text-secondary mb-2">當前狀態：</p>
                <p className="font-medium">
                  {lockMode ? '🔒 隨時上鎖模式' : '🔓 保持解鎖模式'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 管理卡管理卡片 */}
        <Card className="order-3 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>管理卡片</CardTitle>
            <Button
              size="sm"
              onClick={handleAddAdminCard}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              新增管理卡
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingCards ? (
              <div className="text-center py-8 text-text-secondary">
                載入中...
              </div>
            ) : adminCards.length > 0 ? (
              <div className="space-y-3">
                {adminCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {card.is_shared ? (
                        <Key className="w-5 h-5 text-accent" />
                      ) : (
                        <User className="w-5 h-5 text-accent" />
                      )}
                      <div>
                        <p className="font-medium">
                          {card.nickname || card.rfid_uid.slice(-8)}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {card.is_shared ? '共用管理卡' : `${card.user_name} (${card.student_id})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        card.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {card.is_active ? '啟用' : '停用'}
                      </span>
                      <button
                        onClick={() => handleDeleteAdminCard(card.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="刪除管理卡"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                尚無管理卡
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近存取記錄 */}
        <Card className="order-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>最近存取</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{log.user_name}</p>
                      <p className="text-xs text-text-secondary">
                        卡片 {log.rfid_uid.slice(-8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                      <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        {log.action === 'entry' ? '開門' : '註冊'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                暫無存取記錄
              </div>
            )}
          </CardContent>
        </Card>

        {/* 安全提醒 */}
        <Card className="order-5 lg:col-span-2 bg-yellow-50 border-yellow-200">
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
      </div>
    </div>
  )
}
