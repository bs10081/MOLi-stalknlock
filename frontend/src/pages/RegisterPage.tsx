import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { registerService } from '@/services/registerService'
import { userService } from '@/services/userService'

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const adminBindingUserId = searchParams.get('user')

  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalStatus, setModalStatus] = useState('')
  const [modalTitle, setModalTitle] = useState('處理中')
  const [isSuccess, setIsSuccess] = useState(false)
  const [countdown, setCountdown] = useState(90)
  const [currentUser, setCurrentUser] = useState<{ name: string; student_id: string } | null>(null)
  const navigate = useNavigate()
  const pollIntervalRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  const clearIntervals = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => clearIntervals()
  }, [])

  // 管理員綁定模式：自動加載使用者資料並啟動綁定
  useEffect(() => {
    if (adminBindingUserId) {
      loadUserAndStartBinding(adminBindingUserId)
    }
  }, [adminBindingUserId])

  const loadUserAndStartBinding = async (userId: string) => {
    try {
      setLoading(true)
      const users = await userService.getUsers()
      const user = users.find(u => u.id === userId)

      if (!user) {
        setError('找不到指定的使用者')
        return
      }

      setCurrentUser({ name: user.name, student_id: user.student_id })
      setShowModal(true)
      setModalStatus('請在 90 秒內刷卡兩次完成綁定...')
      startPolling(user.student_id)
    } catch (err: any) {
      setError(err.response?.data?.detail || '載入使用者資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = (studentId: string) => {
    setCountdown(90)
    setModalStatus('請在 90 秒內刷卡兩次...')

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearIntervals()
          setModalStatus('刷卡逾時，請重新整理頁面再試')
          return 0
        }
        return prev - 2
      })
    }, 2000)

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const status = await registerService.checkStatus(studentId)
        if (
          status.bound &&
          (!status.binding_in_progress ||
            (status.initial_count !== undefined &&
              status.card_count &&
              status.card_count > status.initial_count))
        ) {
          clearIntervals()
          setIsSuccess(true)
          setModalTitle('綁定完成')
          setModalStatus(`歡迎解鎖門禁（已綁定 ${status.card_count} 張卡片）`)
          setTimeout(() => {
            setShowModal(false)
            // 管理員綁定模式返回卡片管理頁面，否則返回儀表板
            if (adminBindingUserId) {
              navigate('/dashboard/cards')
            } else {
              navigate('/dashboard')
            }
          }, 2000)
        }
      } catch (err) {
        console.error('輪詢錯誤', err)
        clearIntervals()
        setModalStatus('連線錯誤，請重新整理頁面再試')
      }
    }, 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!studentId.trim() || !name.trim()) {
      setError('請填寫學號與姓名')
      return
    }

    setLoading(true)
    setShowModal(true)

    try {
      const response = await registerService.register(studentId.trim(), name.trim())
      setModalStatus(response.data?.message || '請在 90 秒內刷卡兩次...')
      startPolling(studentId.trim())
    } catch (err: any) {
      setError(err.response?.data?.detail || '註冊失敗')
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper showHeader={false} showFooter={false}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold mb-2">
            {adminBindingUserId ? '綁定新卡片' : '進出門禁註冊'}
          </CardTitle>
          <p className="text-sm text-text-secondary">
            {adminBindingUserId
              ? '請在 90 秒內刷卡兩次完成綁定'
              : '請先填寫學號與姓名，送出後依畫面指示刷學生證完成綁定'}
          </p>
        </CardHeader>
        <CardContent>
          {adminBindingUserId && currentUser ? (
            // 管理員綁定模式：顯示使用者資訊
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-text-primary">姓名：</span>
                    <span className="text-text-secondary">{currentUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-text-primary">學號：</span>
                    <span className="text-text-secondary font-mono">{currentUser.student_id}</span>
                  </div>
                </div>
              </div>

              {loading && (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-danger">
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => navigate('/dashboard/cards')}
                variant="secondary"
              >
                返回卡片管理
              </Button>
            </div>
          ) : !adminBindingUserId ? (
            // 自助註冊模式：顯示表單
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="student_id" className="block text-sm font-medium mb-2">
                  學號
                </label>
                <Input
                  id="student_id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  姓名
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? '處理中...' : '送出註冊'}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-danger">
                  {error}
                </div>
              )}
            </form>
          ) : (
            // 載入中狀態
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <h2 className={`text-xl font-semibold ${isSuccess ? 'text-green-600': ''}`}>
              {modalTitle}
            </h2>

            {!isSuccess &&
              !modalTitle.includes('逾時') &&
              !modalTitle.includes('錯誤') && <Spinner />}

            {isSuccess && (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}

            <div
              className={`text-center ${
                isSuccess ? 'text-green-700 font-semibold': 'text-text-secondary'
              }`}
            >
              {modalStatus}
            </div>

            {countdown > 0 &&
              !isSuccess &&
              !modalTitle.includes('逾時') &&
              !modalTitle.includes('錯誤') && (
                <div className="text-sm text-text-secondary">
                  剩餘時間：{Math.floor(countdown / 60)} 分 {countdown % 60} 秒
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
