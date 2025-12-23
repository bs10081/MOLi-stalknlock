import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sidebar - 固定在左側 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content - 添加左邊距補償 sidebar 寬度 */}
      <div className="lg:ml-60">
        {/* Top bar for mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="gap-2"
          >
            <Menu className="w-5 h-5" />
            選單
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="font-semibold">MOLi 門禁</span>
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
