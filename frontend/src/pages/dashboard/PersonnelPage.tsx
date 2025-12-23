import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Edit, Trash2, CreditCard } from 'lucide-react'

// Mock data
interface User {
  id: number
  name: string
  student_id: string
  email: string
  telegram_id: string
  cards: number
  status: 'active' | 'inactive'
}

const initialUsers: User[] = [
  { id: 1, name: '張三', student_id: 'B10901001', email: 'zhang@example.com', telegram_id: '@zhangsan', cards: 2, status: 'active' },
  { id: 2, name: '李四', student_id: 'B10902002', email: 'li@example.com', telegram_id: '@lisi', cards: 1, status: 'active' },
  { id: 3, name: '王五', student_id: 'B10903003', email: 'wang@example.com', telegram_id: '@wangwu', cards: 3, status: 'active' },
]

export const PersonnelPage: React.FC = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    email: '',
    telegram_id: ''
  })

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      student_id: user.student_id,
      email: user.email,
      telegram_id: user.telegram_id
    })
  }

  const handleSave = () => {
    // TODO: 實作儲存邏輯
    console.log('Saving user:', editingUser?.id, formData)
    setEditingUser(null)
  }

  const handleCancel = () => {
    setEditingUser(null)
  }

  const handleCardClick = (userId: number) => {
    // 跳轉到卡片管理頁面，並篩選該使用者的卡片
    navigate(`/dashboard/cards?user=${userId}`)
  }

  const handleToggleStatus = (userId: number) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
          : user
      )
    )
  }

  return (
    <div>
      <PageHeader
        title="人員"
        description="管理使用者資料與卡片綁定"
        actions={
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            新增使用者
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="搜尋姓名、學號或信箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>學號</TableHead>
                  <TableHead>信箱</TableHead>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>綁定卡片</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-sm">{user.student_id}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-text-secondary">{user.telegram_id}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleCardClick(user.id)}
                        className="flex items-center gap-2 text-accent hover:underline"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{user.cards} 張</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'success' : 'secondary'} size="sm">
                        {user.status === 'active' ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleEdit(user)}
                        >
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
          </div>

          {/* Users List - Mobile */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">{user.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">{user.email}</p>
                  </div>
                  <Badge variant={user.status === 'active' ? 'success' : 'secondary'} size="sm">
                    {user.status === 'active' ? '啟用' : '停用'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[80px]">學號:</span>
                    <span className="font-mono">{user.student_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[80px]">Telegram:</span>
                    <span>{user.telegram_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[80px]">綁定卡片:</span>
                    <button
                      onClick={() => handleCardClick(user.id)}
                      className="flex items-center gap-2 text-accent hover:underline"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{user.cards} 張</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="w-3 h-3" />
                    編輯
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1 gap-2">
                    <Trash2 className="w-3 h-3" />
                    刪除
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{users.length} 筆，共 {users.length} 筆記錄
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader onClose={handleCancel}>
            <DialogTitle>編輯使用者</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  姓名
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="請輸入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  學號
                </label>
                <Input
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  placeholder="請輸入學號"
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  信箱
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="請輸入信箱"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Telegram ID
                </label>
                <Input
                  value={formData.telegram_id}
                  onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                  placeholder="請輸入 Telegram ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  狀態
                </label>
                <div className="flex gap-3">
                  <Button
                    variant={editingUser?.status === 'active' ? 'success' : 'secondary'}
                    onClick={() => editingUser && handleToggleStatus(editingUser.id)}
                    className="flex-1"
                  >
                    {editingUser?.status === 'active' ? '✓ 啟用' : '啟用'}
                  </Button>
                  <Button
                    variant={editingUser?.status === 'inactive' ? 'danger' : 'secondary'}
                    onClick={() => editingUser && handleToggleStatus(editingUser.id)}
                    className="flex-1"
                  >
                    {editingUser?.status === 'inactive' ? '✓ 停用' : '停用'}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>提示：</strong>卡片管理請前往「卡片管理」頁面進行操作。
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCancel}>
              取消
            </Button>
            <Button onClick={handleSave}>
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
