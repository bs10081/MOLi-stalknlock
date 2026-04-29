import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, ShieldCheck } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/ui/user-menu'
import { authService } from '@/services/authService'
import { ADMIN_PROFILE_UPDATED_EVENT } from '@/lib/adminProfileEvents'

interface CurrentAdmin {
  id: string
  name: string
}

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminName, setAdminName] = useState<string>('管理員')

  // 獲取當前管理員資訊
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const admin = await authService.checkAuth() as CurrentAdmin | null
        if (admin && admin.name) {
          setAdminName(admin.name)
        } else {
          setAdminName('管理員')
        }
      } catch (error) {
        console.error('Failed to fetch admin info:', error)
      }
    }

    const handleAdminProfileUpdated = () => {
      void fetchAdminInfo()
    }

    void fetchAdminInfo()
    window.addEventListener(ADMIN_PROFILE_UPDATED_EVENT, handleAdminProfileUpdated)

    return () => {
      window.removeEventListener(ADMIN_PROFILE_UPDATED_EVENT, handleAdminProfileUpdated)
    }
  }, [])

  return (
    <div className="min-h-screen bg-transparent text-text-primary">
      {/* Sidebar - 固定在左側 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content - 添加左邊距補償 sidebar 寬度 */}
      <div className="lg:pl-72">
        {/* Top Navigation Bar - 固定在頂部 */}
        <div className="sticky top-0 z-40 border-b border-border/70 bg-white/96 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="gap-2 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="hidden items-center gap-3 lg:flex">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-white text-text-primary shadow-[0_16px_28px_-24px_rgba(17,17,17,0.22)]">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">Administration Console</p>
                <p className="text-xs text-text-secondary">Unified operations surface for users, cards, logs and device control.</p>
              </div>
            </div>

            <div className="ml-auto flex items-center">
              <UserMenu adminName={adminName} />
            </div>
          </div>
        </div>

        {/* Page content - 可獨立滾動 */}
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1240px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
