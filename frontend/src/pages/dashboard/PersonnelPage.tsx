import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, CreditCard } from 'lucide-react'

// Mock data
const mockUsers = [
  { id: 1, name: '張三', email: 'zhang@example.com', telegram_id: '@zhangsan', cards: 2, status: 'active' },
  { id: 2, name: '李四', email: 'li@example.com', telegram_id: '@lisi', cards: 1, status: 'active' },
  { id: 3, name: '王五', email: 'wang@example.com', telegram_id: '@wangwu', cards: 3, status: 'active' },
]

export const PersonnelPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

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
                placeholder="搜尋使用者名稱或信箱..."
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
                      <Badge variant="success" size="sm">
                        啟用
                      </Badge>
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
          </div>

          {/* Users List - Mobile */}
          <div className="md:hidden space-y-4">
            {mockUsers.map((user) => (
              <div key={user.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">{user.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">{user.email}</p>
                  </div>
                  <Badge variant="success" size="sm">
                    啟用
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[80px]">Telegram:</span>
                    <span>{user.telegram_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[80px]">綁定卡片:</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>{user.cards} 張</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="secondary" size="sm" className="flex-1 gap-2">
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
            顯示 1-{mockUsers.length} 筆，共 {mockUsers.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
