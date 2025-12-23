import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Edit, Trash2, CreditCard } from 'lucide-react'
import { userService } from '@/services/userService'
import type { User } from '@/types'

export const PersonnelPage: React.FC = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    email: '',
    telegram_id: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await userService.getUsers()
      setUsers(data)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      setError(err.response?.data?.detail || '載入使用者資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      student_id: user.student_id,
      email: user.email || '',
      telegram_id: user.telegram_id || '',
      is_active: user.is_active,
    })
  }

  const handleAdd = () => {
    setIsAddDialogOpen(true)
    setFormData({
      name: '',
      student_id: '',
      email: '',
      telegram_id: '',
      is_active: true,
    })
  }

  const handleAddUser = async () => {
    if (!formData.name || !formData.student_id) {
      alert('請填寫姓名和學號')
      return
    }

    try {
      setSaving(true)
      await userService.createUser(
        formData.student_id,
        formData.name,
        formData.email || undefined,
        formData.telegram_id || undefined
      )
      await loadUsers()
      setIsAddDialogOpen(false)
      setFormData({ name: '', student_id: '', email: '', telegram_id: '' })
    } catch (err: any) {
      console.error('Failed to create user:', err)
      alert(err.response?.data?.detail || '新增使用者失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!editingUser) return

    console.log('🐛 DEBUG handleSave: formData =', formData)

    try {
      setSaving(true)
      await userService.updateUser(
        editingUser.id,
        formData.student_id,
        formData.name,
        formData.email,
        formData.telegram_id,
        formData.is_active
      )
      await loadUsers()
      setEditingUser(null)
    } catch (err: any) {
      console.error('Failed to update user:', err)
      alert(err.response?.data?.detail || '更新使用者失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('確定要刪除此使用者嗎？')) return

    try {
      await userService.deleteUser(userId)
      await loadUsers()
    } catch (err: any) {
      console.error('Failed to delete user:', err)
      alert(err.response?.data?.detail || '刪除使用者失敗')
    }
  }

  const handleCancel = () => {
    setEditingUser(null)
  }

  const handleCardClick = (userId: string) => {
    navigate(`/dashboard/cards?user=${userId}`)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div>
        <PageHeader
          title="人員"
          description="管理使用者資料與卡片綁定"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-text-secondary">
              載入中...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="人員"
          description="管理使用者資料與卡片綁定"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadUsers}>重試</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="人員"
        description="管理使用者資料與卡片綁定"
        actions={
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            新增使用者
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
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

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>學號</TableHead>
                  <TableHead className="hidden xl:table-cell">信箱</TableHead>
                  <TableHead className="hidden xl:table-cell">Telegram ID</TableHead>
                  <TableHead>綁定卡片</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="hidden lg:table-cell">建立日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-sm">{user.student_id}</TableCell>
                    <TableCell className="hidden xl:table-cell">{user.email || '-'}</TableCell>
                    <TableCell className="hidden xl:table-cell">{user.telegram_id || '-'}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleCardClick(user.id)}
                        className="flex items-center gap-2 text-accent hover:underline"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{user.card_count} 張</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'secondary'} size="sm">
                        {user.is_active ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-text-secondary">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2 whitespace-nowrap"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-3 h-3" />
                          <span className="hidden lg:inline">編輯</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="gap-2 whitespace-nowrap"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="hidden lg:inline">刪除</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary text-base truncate">{user.name}</h3>
                    <p className="text-sm text-text-secondary font-mono mt-0.5">{user.student_id}</p>
                  </div>
                  <Badge variant={user.is_active ? 'success' : 'secondary'} size="sm" className="ml-2 flex-shrink-0">
                    {user.is_active ? '啟用' : '停用'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {user.email && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="font-medium min-w-[64px]">信箱：</span>
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[64px]">綁定卡片：</span>
                    <button
                      onClick={() => handleCardClick(user.id)}
                      className="flex items-center gap-1.5 text-accent hover:underline"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{user.card_count} 張</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 mt-3 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    編輯
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    刪除
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{filteredUsers.length} 筆，共 {filteredUsers.length} 筆記錄
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader onClose={handleCancel}>
            <DialogTitle>編輯使用者</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="請輸入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  學號 <span className="text-red-500">*</span>
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
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="請輸入 Email"
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

              <div className="flex items-center justify-between p-4 bg-gray-50 border border-border rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    帳號狀態
                  </label>
                  <p className="text-xs text-text-secondary">
                    {formData.is_active ? '已啟用：此使用者可以正常進出門禁' : '已停用：此使用者無法進出門禁'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    formData.is_active ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>提示：</strong>卡片管理請前往「卡片管理」頁面進行操作。
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => !open && setIsAddDialogOpen(false)}>
        <DialogContent>
          <DialogHeader onClose={() => setIsAddDialogOpen(false)}>
            <DialogTitle>新增使用者</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="請輸入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  學號 <span className="text-red-500">*</span>
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
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="請輸入 Email"
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
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleAddUser} disabled={saving}>
              {saving ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
