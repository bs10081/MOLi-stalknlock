import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EditPanel } from '@/components/ui/edit-panel'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { Search, Plus, ChevronRight, CreditCard } from 'lucide-react'
import { userService } from '@/services/userService'
import type { User } from '@/types'

interface FormDataType {
  name: string
  student_id: string
  email: string
  telegram_id: string
  is_active: boolean
}

export const PersonnelPage: React.FC = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 批量選擇狀態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 行內編輯狀態（支援多行同時展開）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editFormDataMap, setEditFormDataMap] = useState<Map<string, FormDataType>>(new Map())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // 新增使用者狀態
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [addFormData, setAddFormData] = useState({
    name: '',
    student_id: '',
    email: '',
    telegram_id: '',
  })
  const [addSaving, setAddSaving] = useState(false)

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

  // ========== 批量選擇邏輯 ==========
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (userId: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(userId)
    } else {
      newSet.delete(userId)
    }
    setSelectedIds(newSet)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (!confirm(`確定要刪除 ${selectedIds.size} 位使用者嗎？此操作無法復原。`)) return

    try {
      // TODO: 實作批量刪除 API
      for (const id of Array.from(selectedIds)) {
        await userService.deleteUser(id)
      }
      await loadUsers()
      setSelectedIds(new Set())
      alert('批量刪除成功')
    } catch (err: any) {
      console.error('Failed to bulk delete users:', err)
      alert(err.response?.data?.detail || '批量刪除失敗')
    }
  }

  const handleBulkDisable = async () => {
    if (!confirm(`確定要停用 ${selectedIds.size} 位使用者嗎？`)) return

    try {
      for (const id of Array.from(selectedIds)) {
        const user = users.find(u => u.id === id)
        if (user) {
          await userService.updateUser(
            id,
            user.student_id,
            user.name,
            user.email || '',
            user.telegram_id || '',
            false // 設定為停用
          )
        }
      }
      await loadUsers()
      setSelectedIds(new Set())
      alert('批量停用成功')
    } catch (err: any) {
      console.error('Failed to bulk disable users:', err)
      const errorMessage = err.response?.data?.detail || err.message || '批量停用失敗'
      alert(typeof errorMessage === 'string' ? errorMessage : '批量停用失敗')
    }
  }

  const handleBulkEnable = async () => {
    if (!confirm(`確定要啟用 ${selectedIds.size} 位使用者嗎？`)) return

    try {
      for (const id of Array.from(selectedIds)) {
        const user = users.find(u => u.id === id)
        if (user) {
          await userService.updateUser(
            id,
            user.student_id,
            user.name,
            user.email || '',
            user.telegram_id || '',
            true // 設定為啟用
          )
        }
      }
      await loadUsers()
      setSelectedIds(new Set())
      alert('批量啟用成功')
    } catch (err: any) {
      console.error('Failed to bulk enable users:', err)
      const errorMessage = err.response?.data?.detail || err.message || '批量啟用失敗'
      alert(typeof errorMessage === 'string' ? errorMessage : '批量啟用失敗')
    }
  }

  // ========== 行內編輯邏輯 ==========
  const handleEdit = (user: User) => {
    const newExpandedIds = new Set(expandedIds)
    const newFormDataMap = new Map(editFormDataMap)

    if (newExpandedIds.has(user.id)) {
      // 如果已展開，則收合
      newExpandedIds.delete(user.id)
      newFormDataMap.delete(user.id)
    } else {
      // 展開並初始化表單資料
      newExpandedIds.add(user.id)
      newFormDataMap.set(user.id, {
        name: user.name,
        student_id: user.student_id,
        email: user.email || '',
        telegram_id: user.telegram_id || '',
        is_active: user.is_active,
      })
    }

    setExpandedIds(newExpandedIds)
    setEditFormDataMap(newFormDataMap)
  }

  const handleFormChange = (userId: string, field: keyof FormDataType, value: string | boolean) => {
    const newFormDataMap = new Map(editFormDataMap)
    const formData = newFormDataMap.get(userId)
    if (formData) {
      newFormDataMap.set(userId, { ...formData, [field]: value })
      setEditFormDataMap(newFormDataMap)
    }
  }

  const handleSave = async (userId: string) => {
    const formData = editFormDataMap.get(userId)
    if (!formData) return

    try {
      setSavingIds(new Set(savingIds).add(userId))
      await userService.updateUser(
        userId,
        formData.student_id,
        formData.name,
        formData.email,
        formData.telegram_id,
        formData.is_active
      )
      await loadUsers()

      // 收合編輯區
      const newExpandedIds = new Set(expandedIds)
      const newFormDataMap = new Map(editFormDataMap)
      newExpandedIds.delete(userId)
      newFormDataMap.delete(userId)
      setExpandedIds(newExpandedIds)
      setEditFormDataMap(newFormDataMap)
    } catch (err: any) {
      console.error('Failed to update user:', err)
      alert(err.response?.data?.detail || '更新使用者失敗')
    } finally {
      const newSavingIds = new Set(savingIds)
      newSavingIds.delete(userId)
      setSavingIds(newSavingIds)
    }
  }

  const handleCancel = (userId: string) => {
    const newExpandedIds = new Set(expandedIds)
    const newFormDataMap = new Map(editFormDataMap)
    newExpandedIds.delete(userId)
    newFormDataMap.delete(userId)
    setExpandedIds(newExpandedIds)
    setEditFormDataMap(newFormDataMap)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('確定要刪除此使用者嗎？')) return

    try {
      setDeletingIds(new Set(deletingIds).add(userId))
      await userService.deleteUser(userId)
      await loadUsers()

      // 收合編輯區
      const newExpandedIds = new Set(expandedIds)
      const newFormDataMap = new Map(editFormDataMap)
      newExpandedIds.delete(userId)
      newFormDataMap.delete(userId)
      setExpandedIds(newExpandedIds)
      setEditFormDataMap(newFormDataMap)
    } catch (err: any) {
      console.error('Failed to delete user:', err)
      alert(err.response?.data?.detail || '刪除使用者失敗')
    } finally {
      const newDeletingIds = new Set(deletingIds)
      newDeletingIds.delete(userId)
      setDeletingIds(newDeletingIds)
    }
  }

  // ========== 新增使用者邏輯 ==========
  const handleAdd = () => {
    setIsAddFormOpen(true)
    setAddFormData({
      name: '',
      student_id: '',
      email: '',
      telegram_id: '',
    })
  }

  const handleCancelAdd = () => {
    setIsAddFormOpen(false)
    setAddFormData({
      name: '',
      student_id: '',
      email: '',
      telegram_id: '',
    })
  }

  const handleAddUser = async () => {
    if (!addFormData.name || !addFormData.student_id) {
      alert('請填寫姓名和學號')
      return
    }

    try {
      setAddSaving(true)
      await userService.createUser(
        addFormData.student_id,
        addFormData.name,
        addFormData.email || undefined,
        addFormData.telegram_id || undefined
      )
      await loadUsers()
      setIsAddFormOpen(false)
      setAddFormData({ name: '', student_id: '', email: '', telegram_id: '' })
    } catch (err: any) {
      console.error('Failed to create user:', err)
      alert(err.response?.data?.detail || '新增使用者失敗')
    } finally {
      setAddSaving(false)
    }
  }

  const handleCardClick = (userId: string) => {
    navigate(`/dashboard/cards?user=${userId}`)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 計算全選狀態
  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))
  const someSelected = filteredUsers.some(u => selectedIds.has(u.id)) && !allSelected

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
      />

      <Card>
        <CardContent className="p-0">
          <div className="p-6 pb-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  placeholder="搜尋姓名、學號或信箱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-[34px]"
                />
              </div>
              <Button variant="secondary" className="flex-shrink-0 h-[34px] px-4">
                搜尋
              </Button>
              <Button
                className="gap-2 flex-shrink-0 h-[34px] px-4"
                onClick={handleAdd}
                style={{ backgroundColor: '#046DFF' }}
              >
                <Plus className="w-4 h-4" />
                新增使用者
              </Button>
            </div>
          </div>

          {/* 新增使用者展開式表單 */}
          {isAddFormOpen && (
            <div className="border-t border-b border-gray-200 bg-gray-50 px-6 py-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="請輸入姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    學號 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addFormData.student_id}
                    onChange={(e) => setAddFormData({ ...addFormData, student_id: e.target.value })}
                    placeholder="請輸入學號"
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    placeholder="請輸入 Email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Telegram ID
                  </label>
                  <Input
                    value={addFormData.telegram_id}
                    onChange={(e) => setAddFormData({ ...addFormData, telegram_id: e.target.value })}
                    placeholder="請輸入 Telegram ID"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={handleCancelAdd}
                  disabled={addSaving}
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={addSaving}
                >
                  {addSaving ? '新增中...' : '新增'}
                </Button>
              </div>
            </div>
          )}

          {/* 批量操作欄 */}
          {selectedIds.size > 0 && (
            <div className="pt-4 pb-2">
              <BulkActionBar
                selectedCount={selectedIds.size}
                totalCount={filteredUsers.length}
                onClearSelection={handleClearSelection}
                onBulkDelete={handleBulkDelete}
                onBulkDisable={handleBulkDisable}
                onBulkEnable={handleBulkEnable}
                itemType="users"
              />
            </div>
          )}

          <div className={`hidden md:block overflow-x-auto ${selectedIds.size > 0 ? '' : 'mt-6'}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
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
                {filteredUsers.map((user) => {
                  const isExpanded = expandedIds.has(user.id)
                  const formData = editFormDataMap.get(user.id)
                  const isSaving = savingIds.has(user.id)
                  const isDeleting = deletingIds.has(user.id)

                  return (
                    <React.Fragment key={user.id}>
                      <TableRow>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onChange={(checked) => handleSelectOne(user.id, checked)}
                          />
                        </TableCell>
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
                          <button
                            onClick={() => handleEdit(user)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                          >
                            Edit
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>

                      {/* 行內編輯區域 */}
                      {isExpanded && formData && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0">
                            <EditPanel
                              onSave={() => handleSave(user.id)}
                              onCancel={() => handleCancel(user.id)}
                              onDelete={() => handleDelete(user.id)}
                              saving={isSaving}
                              deleting={isDeleting}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-text-primary mb-1">
                                    姓名 <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    value={formData.name}
                                    onChange={(e) => handleFormChange(user.id, 'name', e.target.value)}
                                    placeholder="請輸入姓名"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-text-primary mb-1">
                                    學號 <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    value={formData.student_id}
                                    onChange={(e) => handleFormChange(user.id, 'student_id', e.target.value)}
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
                                    onChange={(e) => handleFormChange(user.id, 'email', e.target.value)}
                                    placeholder="請輸入 Email"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-text-primary mb-1">
                                    Telegram ID
                                  </label>
                                  <Input
                                    value={formData.telegram_id}
                                    onChange={(e) => handleFormChange(user.id, 'telegram_id', e.target.value)}
                                    placeholder="請輸入 Telegram ID"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-text-primary mb-1">
                                    帳號狀態
                                  </label>
                                  <div className="flex items-center gap-3 h-10 px-3 bg-white border border-gray-200 rounded-lg">
                                    <span className="text-sm text-text-secondary flex-1">
                                      {formData.is_active ? '已啟用：此使用者可以正常進出門禁' : '已停用：此使用者無法進出門禁'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleFormChange(user.id, 'is_active', !formData.is_active)}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 flex-shrink-0 ${
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
                                </div>
                              </div>
                            </EditPanel>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3 p-6 pt-0 mt-6">
            {filteredUsers.map((user) => {
              const isExpanded = expandedIds.has(user.id)
              const formData = editFormDataMap.get(user.id)
              const isSaving = savingIds.has(user.id)
              const isDeleting = deletingIds.has(user.id)

              return (
                <div key={user.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* 卡片標題區域 */}
                  <div className="p-4">
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

                    {/* Edit 連結 */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(user)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                      >
                        Edit
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 行內編輯區域（展開時顯示）*/}
                  {isExpanded && formData && (
                    <div className="bg-gray-50 border-t border-gray-200 p-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            姓名 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={formData.name}
                            onChange={(e) => handleFormChange(user.id, 'name', e.target.value)}
                            placeholder="請輸入姓名"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            學號 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={formData.student_id}
                            onChange={(e) => handleFormChange(user.id, 'student_id', e.target.value)}
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
                            onChange={(e) => handleFormChange(user.id, 'email', e.target.value)}
                            placeholder="請輸入 Email"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            Telegram ID
                          </label>
                          <Input
                            value={formData.telegram_id}
                            onChange={(e) => handleFormChange(user.id, 'telegram_id', e.target.value)}
                            placeholder="請輸入 Telegram ID"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            帳號狀態
                          </label>
                          <div className="flex items-center gap-3 h-10 px-3 bg-white border border-gray-200 rounded-lg">
                            <span className="text-sm text-text-secondary flex-1">
                              {formData.is_active ? '已啟用' : '已停用'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleFormChange(user.id, 'is_active', !formData.is_active)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 flex-shrink-0 ${
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
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancel(user.id)}
                              disabled={isSaving || isDeleting}
                              className="flex-1"
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(user.id)}
                              disabled={isSaving || isDeleting}
                              className="flex-1"
                            >
                              {isSaving ? '儲存中...' : '儲存'}
                            </Button>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            disabled={isSaving || isDeleting}
                            className="w-full"
                          >
                            {isDeleting ? '刪除中...' : '刪除使用者'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="px-6 pb-6 pt-4 text-sm text-text-secondary border-t border-border">
            顯示 1-{filteredUsers.length} 筆，共 {filteredUsers.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
