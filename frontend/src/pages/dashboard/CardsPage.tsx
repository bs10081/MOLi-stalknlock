import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Trash2 } from 'lucide-react'

// Mock data
const mockCards = [
  { id: 1, card_id: '****1234', owner: '張三', status: 'active', created_at: '2024-01-15' },
  { id: 2, card_id: '****5678', owner: '張三', status: 'active', created_at: '2024-02-01' },
  { id: 3, card_id: '****9012', owner: '李四', status: 'active', created_at: '2024-01-20' },
  { id: 4, card_id: '****3456', owner: '王五', status: 'inactive', created_at: '2023-12-10' },
]

export const CardsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div>
      <PageHeader
        title="卡片管理"
        description="管理所有 RFID 卡片"
        actions={
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            新增卡片
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
                placeholder="搜尋卡片 ID 或持有人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Cards Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>卡片 ID</TableHead>
                  <TableHead>持有人</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>建立日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium font-mono">{card.card_id}</TableCell>
                    <TableCell>{card.owner}</TableCell>
                    <TableCell>
                      <Badge variant={card.status === 'active' ? 'success' : 'secondary'} size="sm">
                        {card.status === 'active' ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary">{card.created_at}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="danger" size="sm" className="gap-2">
                        <Trash2 className="w-3 h-3" />
                        移除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards List - Mobile */}
          <div className="md:hidden space-y-4">
            {mockCards.map((card) => (
              <div key={card.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium font-mono text-text-primary">{card.card_id}</h3>
                    <p className="text-sm text-text-secondary mt-1">持有人：{card.owner}</p>
                  </div>
                  <Badge variant={card.status === 'active' ? 'success' : 'secondary'} size="sm">
                    {card.status === 'active' ? '啟用' : '停用'}
                  </Badge>
                </div>

                <div className="text-sm text-text-secondary">
                  建立日期：{card.created_at}
                </div>

                <div className="pt-2 border-t border-border">
                  <Button variant="danger" size="sm" className="w-full gap-2">
                    <Trash2 className="w-3 h-3" />
                    移除
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{mockCards.length} 筆，共 {mockCards.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
