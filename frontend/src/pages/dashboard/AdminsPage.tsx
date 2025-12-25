import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Trash2 } from 'lucide-react'
import { adminService } from '@/services/adminService'
import type { Admin } from '@/types'

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

  useEffect(() => {
    loadAdmins()
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

  const handleAdd = () => {
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

  const handleDelete = async (adminId: string) => {
    if (!confirm('確定要刪除此管理員嗎？')) return

    try {
      await adminService.deleteAdmin(adminId)
      await loadAdmins()
    } catch (err: any) {
      console.error('Failed to delete admin:', err)
      alert(err.response?.data?.detail || '刪除管理員失敗')
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div>
        <PageHeader
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
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.username}</TableCell>
                    <TableCell>{admin.name}</TableCell>
                    <TableCell className="text-text-secondary">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDelete(admin.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                        刪除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3 p-6 pt-0 mt-6">
            {filteredAdmins.map((admin) => (
              <div key={admin.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="font-medium text-text-primary">{admin.username}</h3>
                  <p className="text-sm text-text-secondary mt-1">{admin.name}</p>
                </div>

                <div className="text-sm text-text-secondary">
                  建立日期：{new Date(admin.created_at).toLocaleDateString()}
                </div>

                <div className="pt-2 border-t border-border">
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleDelete(admin.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    刪除
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 pt-4 text-sm text-text-secondary border-t border-border">
            顯示 1-{filteredAdmins.length} 筆，共 {filteredAdmins.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
