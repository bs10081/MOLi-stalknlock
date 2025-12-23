import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Trash2 } from 'lucide-react'
import { adminService } from '@/services/adminService'
import type { Admin } from '@/types'

export const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
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

  const handleCreate = async () => {
    if (!formData.username || !formData.password || !formData.name) {
      alert('請填寫所有欄位')
      return
    }

    try {
      setCreating(true)
      await adminService.createAdmin(formData.username, formData.password, formData.name)
      await loadAdmins()
      setShowCreateDialog(false)
      setFormData({ username: '', password: '', name: '' })
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
        actions={
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            新增管理員
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="搜尋管理員..."
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

          <div className="md:hidden space-y-4">
            {filteredAdmins.map((admin) => (
              <div key={admin.id} className="border border-border rounded-lg p-4 space-y-3">
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

          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{filteredAdmins.length} 筆，共 {filteredAdmins.length} 筆記錄
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader onClose={() => setShowCreateDialog(false)}>
            <DialogTitle>新增管理員</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  使用者名稱
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="請輸入使用者名稱"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  密碼
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="請輸入密碼"
                />
              </div>

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
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
