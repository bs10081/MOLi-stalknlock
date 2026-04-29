import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { authService } from '@/services/authService'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  adminName?: string
}

export const UserMenu: React.FC<UserMenuProps> = ({ adminName = '管理員' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    if (isLoggingOut) return

    try {
      setIsLoggingOut(true)
      await authService.logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // 即使失敗也導航到登入頁
      navigate('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  // 取得管理員姓名的首字母
  const getInitial = () => {
    return adminName.charAt(0).toUpperCase()
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 觸發按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-border/60 bg-white/80 px-3 py-2 text-left shadow-[0_16px_32px_-24px_rgba(15,23,42,0.28)] transition-colors hover:bg-white',
          isOpen && 'ring-2 ring-primary/10',
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-text-primary text-xs font-semibold text-white">
          {getInitial()}
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold text-text-primary">{adminName}</p>
          <p className="text-xs text-text-secondary">Administrator</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-64 rounded-[24px] border border-border/70 bg-white/96 p-2 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur-xl">
          {/* 管理員資訊 */}
          <div className="border-b border-border/60 px-3 py-3">
            <p className="text-sm font-semibold text-text-primary">{adminName}</p>
            <p className="mt-1 text-xs text-text-secondary">目前登入的後台管理員帳號</p>
          </div>

          {/* 選單項目 */}
          <div className="pt-2">
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/8 hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? '登出中...' : '登出'}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
