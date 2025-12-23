import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { authService } from '@/services/authService'

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
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold">
          {getInitial()}
        </div>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* 管理員資訊 */}
          <div className="px-4 py-2.5 border-b border-gray-200">
            <p className="text-sm font-medium text-text-primary">{adminName}</p>
          </div>

          {/* 選單項目 */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? '登出中...' : '登出'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
