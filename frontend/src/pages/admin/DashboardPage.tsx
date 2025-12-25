import React, { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit, Trash2, CreditCard } from 'lucide-react'

// Mock data
const mockUsers = [
  { id: 1, name: '張三', email: 'zhang@example.com', telegram_id: '@zhangsan', cards: 2, status: 'active' },
  { id: 2, name: '李四', email: 'li@example.com', telegram_id: '@lisi', cards: 1, status: 'active' },
  { id: 3, name: '王五', email: 'wang@example.com', telegram_id: '@wangwu', cards: 3, status: 'active' },
]

const mockAdmins = [
  { id: 1, username: 'admin', email: 'admin@moli.com', created_at: '2024-01-01' },
  { id: 2, username: 'operator', email: 'operator@moli.com', created_at: '2024-01-15' },
]

export const DashboardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'admins'>('users')

  return (
    <PageWrapper>
      <div className="w-full max-w-7xl space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            管理後台
          </h1>
          <p className="text-text-secondary">
            管理使用者、卡片綁定與系統管理員
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              使用者管理
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'admins'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              管理員
            </button>
          </nav>
        </div>

        {/* Users Management */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">使用者列表</CardTitle>
                  <p className="text-sm text-text-secondary mt-1">
                    管理使用者資料與卡片綁定
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Actions */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <Input
                    placeholder="搜尋使用者名稱或信箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新增使用者
                </Button>
              </div>

              {/* Users Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>信箱</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>綁定卡片</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-text-secondary">{user.telegram_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-text-secondary" />
                          <span>{user.cards} 張</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          啟用
                        </span>
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
                顯示 1-{mockUsers.length} 筆，共 {mockUsers.length} 筆記錄
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admins Management */}
        {activeTab === 'admins' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">管理員列表</CardTitle>
                  <p className="text-sm text-text-secondary mt-1">
                    管理系統管理員帳號
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Actions */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <Input
                    placeholder="搜尋管理員..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新增管理員
                </Button>
              </div>

              {/* Admins Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>使用者名稱</TableHead>
                    <TableHead>信箱</TableHead>
                    <TableHead>建立日期</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.username}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell className="text-text-secondary">{admin.created_at}</TableCell>
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
                顯示 1-{mockAdmins.length} 筆，共 {mockAdmins.length} 筆記錄
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
