import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditPanel } from '@/components/ui/edit-panel'
import { Search, Plus, Trash2, ChevronRight } from 'lucide-react'
import { adminService } from '@/services/adminService'
import { authService } from '@/services/authService'
import { ADMIN_PROFILE_UPDATED_EVENT } from '@/lib/adminProfileEvents'
import type { Admin } from '@/types'
import { formatDate } from '@/lib/dateTime'

interface EditFormData {
  name: string
  password: string
}

interface CurrentAdmin {
  id: string
}

export const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: ''
  })
  const [creating, setCreating] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: '',
    password: ''
  })
  const [savingAdminId, setSavingAdminId] = useState<string | null>(null)
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null)

  useEffect(() => {
    void loadAdmins()
    void loadCurrentAdmin()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getAdmins()
      setAdmins(data)
    } catch (err: any) {
      console.error('Failed to load admins:', err)
      setError(err.response?.data?.detail || '載入管理員資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentAdmin = async () => {
    const currentAdmin = await authService.checkAuth() as CurrentAdmin | null
    setCurrentAdminId(currentAdmin?.id ?? null)
  }

  const resetEditState = () => {
    setExpandedAdminId(null)
    setEditFormData({
      name: '',
      password: ''
    })
  }

  const handleAdd = () => {
    resetEditState()
    setIsAddFormOpen(true)
    setFormData({ username: '', password: '', name: '' })
  }

  const handleCancelAdd = () => {
    setIsAddFormOpen(false)
    setFormData({ username: '', password: '', name: '' })
  }

  const handleCreate = async () => {
    if (!formData.username || !formData.password || !formData.name) {
      alert('請填寫所有欄位')
      return
    }

    try {
      setCreating(true)
      await adminService.createAdmin(formData.username, formData.password, formData.name)
      await loadAdmins()
      setIsAddFormOpen(false)
      setFormData({ username: '', password: '', name: '' })
      alert('管理員新增成功')
    } catch (err: any) {
      console.error('Failed to create admin:', err)
      alert(err.response?.data?.detail || '新增管理員失敗')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (admin: Admin) => {
    setIsAddFormOpen(false)
    setFormData({ username: '', password: '', name: '' })

    if (expandedAdminId === admin.id) {
      resetEditState()
      return
    }

    setExpandedAdminId(admin.id)
    setEditFormData({
      name: admin.name,
      password: ''
    })
  }

  const handleCancelEdit = () => {
    resetEditState()
  }

  const handleEditFormChange = (field: keyof EditFormData, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
  }

  const getEditState = (admin: Admin) => {
    const trimmedName = editFormData.name.trim()
    const trimmedPassword = editFormData.password.trim()
    const nameChanged = trimmedName !== admin.name
    const passwordChanged = trimmedPassword.length > 0
    const isValid = trimmedName.length > 0
    const hasChanges = isValid && (nameChanged || passwordChanged)

    return {
      trimmedName,
      trimmedPassword,
      nameChanged,
      passwordChanged,
      isValid,
      hasChanges,
    }
  }

  const handleSave = async (admin: Admin) => {
    const { trimmedName, trimmedPassword, nameChanged, passwordChanged, isValid, hasChanges } = getEditState(admin)

    if (!isValid) {
      alert('姓名不能為空白')
      return
    }

    if (!hasChanges) {
      handleCancelEdit()
      return
    }

    try {
      setSavingAdminId(admin.id)
      await adminService.updateAdmin(
        admin.id,
        nameChanged ? trimmedName : undefined,
        passwordChanged ? trimmedPassword : undefined
      )
      await loadAdmins()
      if (currentAdminId === admin.id && nameChanged) {
        window.dispatchEvent(new CustomEvent(ADMIN_PROFILE_UPDATED_EVENT))
      }
      handleCancelEdit()
      alert('管理員資料已更新')
    } catch (err: any) {
      console.error('Failed to update admin:', err)
      alert(err.response?.data?.detail || '更新管理員失敗')
    } finally {
      setSavingAdminId(null)
    }
  }

  const handleDelete = async (adminId: string) => {
    if (!confirm('確定要刪除此管理員嗎？')) return

    try {
      setDeletingAdminId(adminId)
      await adminService.deleteAdmin(adminId)
      await loadAdmins()
      if (expandedAdminId === adminId) {
        handleCancelEdit()
      }
    } catch (err: any) {
      console.error('Failed to delete admin:', err)
      alert(err.response?.data?.detail || '刪除管理員失敗')
    } finally {
      setDeletingAdminId(null)
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderEditFields = (admin: Admin) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          使用者名稱
        </label>
        <Input
          value={admin.username}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          姓名 <span className="text-red-500">*</span>
        </label>
        <Input
          value={editFormData.name}
          onChange={(e) => handleEditFormChange('name', e.target.value)}
          placeholder="請輸入姓名"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          新密碼
        </label>
        <Input
          type="password"
          value={editFormData.password}
          onChange={(e) => handleEditFormChange('password', e.target.value)}
          placeholder="留空則不更新密碼"
        />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Security"
          title="管理員"
          description="管理系統管理員帳號"
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
          eyebrow="Security"
          title="管理員"
          description="管理系統管理員帳號"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadAdmins}>重試</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Security"
        title="管理員"
        description="管理系統管理員帳號"
      />

      <Card>
        <CardContent className="p-0">
          <div className="p-6 pb-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  placeholder="搜尋管理員..."
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
                新增管理員
              </Button>
            </div>
          </div>

          {/* 新增管理員展開式表單 */}
          {isAddFormOpen && (
            <div className="border-t border-b border-gray-200 bg-gray-50 px-6 py-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    使用者名稱 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="請輸入使用者名稱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    密碼 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="請輸入密碼"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="請輸入姓名"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={handleCancelAdd}
                  disabled={creating}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? '新增中...' : '新增'}
                </Button>
              </div>
            </div>
          )}

          <div className="hidden md:block overflow-x-auto mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>使用者名稱</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>建立日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => {
                  const isExpanded = expandedAdminId === admin.id
                  const isSaving = savingAdminId === admin.id
                  const isDeleting = deletingAdminId === admin.id
                  const { hasChanges } = getEditState(admin)

                  return (
                    <React.Fragment key={admin.id}>
                      <TableRow>
                        <TableCell className="font-medium">{admin.username}</TableCell>
                        <TableCell>{admin.name}</TableCell>
                        <TableCell className="text-text-secondary">
                          {formatDate(admin.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => handleEdit(admin)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                          >
                            Edit
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={4} className="p-0">
                            <EditPanel
                              onSave={() => handleSave(admin)}
                              onCancel={handleCancelEdit}
                              onDelete={() => handleDelete(admin.id)}
                              saveDisabled={!hasChanges}
                              saving={isSaving}
                              deleting={isDeleting}
                            >
                              {renderEditFields(admin)}
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
            {filteredAdmins.map((admin) => {
              const isExpanded = expandedAdminId === admin.id
              const isSaving = savingAdminId === admin.id
              const isDeleting = deletingAdminId === admin.id
              const { hasChanges } = getEditState(admin)

              return (
                <div key={admin.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4">
                    <div>
                      <h3 className="font-medium text-text-primary">{admin.username}</h3>
                      <p className="text-sm text-text-secondary mt-1">{admin.name}</p>
                    </div>

                    <div className="text-sm text-text-secondary mt-3">
                      建立日期：{formatDate(admin.created_at)}
                    </div>

                    <div className="pt-3 mt-3 border-t border-border">
                      <button
                        onClick={() => handleEdit(admin)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                      >
                        Edit
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200 p-4">
                      <div className="space-y-4">
                        {renderEditFields(admin)}

                        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={isSaving || isDeleting}
                              className="flex-1"
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(admin)}
                              disabled={isSaving || isDeleting || !hasChanges}
                              className="flex-1"
                            >
                              {isSaving ? '儲存中...' : '儲存'}
                            </Button>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(admin.id)}
                            disabled={isSaving || isDeleting}
                            className="w-full gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            {isDeleting ? '刪除中...' : '刪除'}
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
            顯示 1-{filteredAdmins.length} 筆，共 {filteredAdmins.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
