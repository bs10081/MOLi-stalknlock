import React, { useState, useEffect, useRef } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card as UICard, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Edit, Trash2, CreditCard, CheckCircle, QrCode } from 'lucide-react'
import { userService } from '@/services/userService'
import { registerService } from '@/services/registerService'
import type { User } from '@/types'

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // ========== 註冊 Dialog 狀態 ==========
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
  const [registerFormData, setRegisterFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    telegramId: '',
    nickname: '',
  })
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'submitting' | 'binding' | 'success' | 'timeout' | 'error'>('idle')
  const [registerStep, setRegisterStep] = useState(0)
  const [registerCountdown, setRegisterCountdown] = useState(90)
  const [registerMessage, setRegisterMessage] = useState('')

  // Refs 管理定時器
  const pollIntervalRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    return () => clearRegisterIntervals()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const usersData = await userService.getUsers()
      setUsers(usersData)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      setError(err.response?.data?.detail || '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const clearRegisterIntervals = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  const handleOpenRegisterDialog = () => {
    setRegisterFormData({
      studentId: '',
      name: '',
      email: '',
      telegramId: '',
      nickname: '',
    })
    setRegisterStatus('idle')
    setRegisterStep(0)
    setRegisterCountdown(90)
    setRegisterMessage('')
    setIsRegisterDialogOpen(true)
  }

  const handleCloseRegisterDialog = () => {
    clearRegisterIntervals()
    setIsRegisterDialogOpen(false)
    setRegisterStatus('idle')
    setRegisterStep(0)
    setRegisterCountdown(90)
    setRegisterMessage('')
    setRegisterFormData({
      studentId: '',
      name: '',
      email: '',
      telegramId: '',
      nickname: '',
    })
  }

  const handleRegisterSubmit = async () => {
    if (!registerFormData.studentId || !registerFormData.name) {
      alert('請填寫學號和姓名')
      return
    }

    setRegisterStatus('submitting')

    try {
      // 提交到 /register 端點
      await registerService.registerUser(
        registerFormData.studentId,
        registerFormData.name,
        registerFormData.email || undefined,
        registerFormData.telegramId || undefined,
        registerFormData.nickname || undefined
      )

      // 開始輪詢
      setRegisterStatus('binding')
      setRegisterMessage('請在 90 秒內刷卡兩次...')
      startRegisterPolling(registerFormData.studentId)
    } catch (err: any) {
      console.error('Failed to submit registration:', err)
      setRegisterStatus('error')
      setRegisterMessage(err.response?.data?.detail || '提交失敗')
    }
  }

  const startRegisterPolling = (studentId: string) => {
    let initialCount: number | null = null

    // 倒數計時
    countdownIntervalRef.current = window.setInterval(() => {
      setRegisterCountdown(prev => {
        if (prev <= 1) {
          clearRegisterIntervals()
          setRegisterStatus('timeout')
          setRegisterMessage('綁定超時，請重試')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // 輪詢綁定狀態
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const data = await registerService.checkBindingStatus(studentId)

        // 更新步驟
        setRegisterStep(data.step || 0)

        if (initialCount === null && data.initial_count !== undefined) {
          initialCount = data.initial_count
        }

        // 檢查綁定完成
        if (data.bound && data.card_count !== undefined && data.card_count > (initialCount ?? 0)) {
          clearRegisterIntervals()
          setRegisterStatus('success')
          setRegisterMessage('綁定成功！')
          await loadUsers() // 刷新用戶列表
        }
      } catch (err: any) {
        console.error('Polling error:', err)
        clearRegisterIntervals()
        setRegisterStatus('error')
        setRegisterMessage('檢查狀態失敗')
      }
    }, 2000)
  }

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.telegram_id && user.telegram_id.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  if (loading) {
    return (
      <div>
        <PageHeader title="使用者管理" description="管理使用者資料與卡片綁定" />
        <UICard>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-text-secondary">載入中...</div>
          </CardContent>
        </UICard>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="使用者管理" description="管理使用者資料與卡片綁定" />
        <UICard>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadUsers}>重試</Button>
            </div>
          </CardContent>
        </UICard>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="使用者管理"
        description="管理使用者資料與卡片綁定"
        actions={
          <Button className="gap-2" onClick={handleOpenRegisterDialog}>
            <Plus className="w-4 h-4" />
            新增用戶並綁定卡片
          </Button>
        }
      />

      <UICard>
        <CardContent className="pt-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="搜尋使用者名稱、學號或信箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>學號</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>信箱</TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>綁定卡片</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.student_id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell className="text-text-secondary">{user.email || '-'}</TableCell>
                  <TableCell className="text-text-secondary">{user.telegram_id || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-text-secondary" />
                      <span>{user.card_count} 張</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'success' : 'default'} size="sm">
                      {user.is_active ? '啟用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Edit className="w-3 h-3" />
                        編輯
                      </Button>
                      <Button variant="danger" size="sm" className="gap-2">
                        <Trash2 className="w-3 h-3" />
                        刪除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Table Footer */}
          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{filteredUsers.length} 筆，共 {filteredUsers.length} 筆記錄
          </div>
        </CardContent>
      </UICard>

      {/* 新增用戶並綁定卡片 Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={handleCloseRegisterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增用戶並綁定 RFID 卡片</DialogTitle>
          </DialogHeader>

          {registerStatus === 'idle' || registerStatus === 'submitting' ? (
            /* 階段一：填寫新用戶資訊 */
            <DialogBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    學號 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={registerFormData.studentId}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, studentId: e.target.value })}
                    placeholder="輸入學號"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={registerFormData.name}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, name: e.target.value })}
                    placeholder="輸入姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    value={registerFormData.email}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, email: e.target.value })}
                    placeholder="輸入 Email（選填）"
                    type="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Telegram ID</label>
                  <Input
                    value={registerFormData.telegramId}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, telegramId: e.target.value })}
                    placeholder="輸入 Telegram ID（選填）"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">卡片別名</label>
                  <Input
                    value={registerFormData.nickname}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, nickname: e.target.value })}
                    placeholder="例如：學生證、悠遊卡（選填）"
                  />
                </div>
              </div>
            </DialogBody>
          ) : (
            /* 階段二：等待刷卡 */
            <DialogBody>
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <QrCode className="w-16 h-16 text-blue-600" />
                </div>

                <div className="text-xl font-semibold">
                  ⏱️ 剩餘 {registerCountdown} 秒
                </div>

                {/* 步驟指示器 */}
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${registerStep >= 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {registerStep > 0 ? <CheckCircle className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                    <span>等待第一次刷卡</span>
                  </div>
                  <div className={`flex items-center gap-2 ${registerStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {registerStep > 1 ? <CheckCircle className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                    <span>確認刷卡</span>
                  </div>
                  <div className={`flex items-center gap-2 ${registerStatus === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                    {registerStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                    <span>綁定完成</span>
                  </div>
                </div>

                <p className="text-text-secondary">{registerMessage}</p>

                {registerStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">✅ 綁定成功！</p>
                  </div>
                )}

                {registerStatus === 'timeout' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-medium">⏰ 綁定超時</p>
                  </div>
                )}

                {registerStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium">❌ 綁定失敗</p>
                  </div>
                )}
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            {registerStatus === 'idle' || registerStatus === 'submitting' ? (
              <>
                <Button variant="secondary" onClick={handleCloseRegisterDialog}>
                  取消
                </Button>
                <Button
                  onClick={handleRegisterSubmit}
                  disabled={registerStatus === 'submitting'}
                >
                  {registerStatus === 'submitting' ? '提交中...' : '開始綁定 →'}
                </Button>
              </>
            ) : (
              <>
                {registerStatus === 'binding' && (
                  <Button variant="secondary" onClick={handleCloseRegisterDialog}>
                    取消綁定
                  </Button>
                )}
                {(registerStatus === 'success' || registerStatus === 'timeout' || registerStatus === 'error') && (
                  <Button onClick={handleCloseRegisterDialog}>
                    關閉
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
