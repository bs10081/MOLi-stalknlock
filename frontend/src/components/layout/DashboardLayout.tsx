import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/ui/user-menu'
import { authService } from '@/services/authService'

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminName, setAdminName] = useState<string>('管理員')

  // 獲取當前管理員資訊
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const admin = await authService.checkAuth()
        if (admin && admin.name) {
          setAdminName(admin.name)
        }
      } catch (error) {
        console.error('Failed to fetch admin info:', error)
      }
    }
    fetchAdminInfo()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar - 固定在左側 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content - 添加左邊距補償 sidebar 寬度 */}
      <div className="lg:ml-60">
        {/* Top Navigation Bar - 固定在頂部 */}
        <div className="sticky top-0 z-40 h-14 px-4 lg:px-6 flex items-center justify-between bg-white border-b border-border">
          {/* 左側：手機版選單按鈕 */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden gap-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* 右側：管理員選單 */}
          <div className="flex items-center ml-auto">
            <UserMenu adminName={adminName} />
          </div>
        </div>

        {/* Page content - 可獨立滾動 */}
        <main className="p-6 max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
