import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'

// Mock data
const mockAdmins = [
  { id: 1, username: 'admin', email: 'admin@moli.com', created_at: '2024-01-01' },
  { id: 2, username: 'operator', email: 'operator@moli.com', created_at: '2024-01-15' },
]

export const AdminsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div>
      <PageHeader
        title="管理員"
        description="管理系統管理員帳號"
        actions={
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            新增管理員
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
                placeholder="搜尋管理員..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
    </div>
  )
}
