import React, { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Trash2, X, Edit } from 'lucide-react'

// Mock data
interface CardData {
  id: number
  card_id: string
  alias: string
  owner: string
  owner_id: number
  status: 'active' | 'inactive'
  created_at: string
}

const initialCards: CardData[] = [
  { id: 1, card_id: '****1234', alias: '學生證', owner: '張三', owner_id: 1, status: 'active', created_at: '2024-01-15' },
  { id: 2, card_id: '****5678', alias: '悠遊卡', owner: '張三', owner_id: 1, status: 'active', created_at: '2024-02-01' },
  { id: 3, card_id: '****9012', alias: '手錶', owner: '李四', owner_id: 2, status: 'active', created_at: '2024-01-20' },
  { id: 4, card_id: '****3456', alias: '備用卡', owner: '王五', owner_id: 3, status: 'inactive', created_at: '2023-12-10' },
]

export const CardsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState<CardData[]>(initialCards)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCard, setEditingCard] = useState<CardData | null>(null)
  const [formData, setFormData] = useState({ alias: '' })

  const userIdFilter = searchParams.get('user')

  // Filter cards based on user ID from URL
  const filteredCards = useMemo(() => {
    let filteredList = cards

    // Filter by user ID if provided
    if (userIdFilter) {
      const userId = parseInt(userIdFilter)
      filteredList = filteredList.filter(card => card.owner_id === userId)
    }

    // Filter by search term
    if (searchTerm) {
      filteredList = filteredList.filter(card =>
        card.card_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.owner.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filteredList
  }, [cards, userIdFilter, searchTerm])

  const clearFilter = () => {
    navigate('/dashboard/cards')
  }

  const handleToggleStatus = (cardId: number) => {
    setCards(prevCards =>
      prevCards.map(card =>
        card.id === cardId
          ? { ...card, status: card.status === 'active' ? 'inactive' : 'active' }
          : card
      )
    )
  }

  const handleEdit = (card: CardData) => {
    setEditingCard(card)
    setFormData({ alias: card.alias })
  }

  const handleSave = () => {
    if (!editingCard) return

    setCards(prevCards =>
      prevCards.map(card =>
        card.id === editingCard.id
          ? { ...card, alias: formData.alias }
          : card
      )
    )
    setEditingCard(null)
  }

  const handleCancel = () => {
    setEditingCard(null)
  }

  const filteredUserName = userIdFilter
    ? cards.find(card => card.owner_id === parseInt(userIdFilter))?.owner
    : null

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
          {/* Filter Badge */}
          {userIdFilter && filteredUserName && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-900">
                <strong>篩選條件：</strong>顯示使用者「{filteredUserName}」的卡片
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilter}
                className="ml-auto gap-2 text-blue-900 hover:text-blue-700 hover:bg-blue-100"
              >
                <X className="w-4 h-4" />
                清除篩選
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="搜尋卡片 ID、別名或持有人..."
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
                  <TableHead>別名</TableHead>
                  <TableHead>持有人</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>建立日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.length > 0 ? (
                  filteredCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium font-mono">{card.card_id}</TableCell>
                      <TableCell>{card.alias}</TableCell>
                      <TableCell>{card.owner}</TableCell>
                      <TableCell>
                        <Badge variant={card.status === 'active' ? 'success' : 'secondary'} size="sm">
                          {card.status === 'active' ? '啟用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-secondary">{card.created_at}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleEdit(card)}
                          >
                            <Edit className="w-3 h-3" />
                            編輯
                          </Button>
                          <Button variant="danger" size="sm" className="gap-2">
                            <Trash2 className="w-3 h-3" />
                            移除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      沒有找到符合條件的卡片
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Cards List - Mobile */}
          <div className="md:hidden space-y-4">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <div key={card.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium font-mono text-text-primary">{card.card_id}</h3>
                      <p className="text-sm font-medium text-text-primary mt-1">{card.alias}</p>
                      <p className="text-sm text-text-secondary mt-0.5">持有人：{card.owner}</p>
                    </div>
                    <Badge variant={card.status === 'active' ? 'success' : 'secondary'} size="sm">
                      {card.status === 'active' ? '啟用' : '停用'}
                    </Badge>
                  </div>

                  <div className="text-sm text-text-secondary">
                    建立日期：{card.created_at}
                  </div>

                  <div className="pt-2 border-t border-border flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleEdit(card)}
                    >
                      <Edit className="w-3 h-3" />
                      編輯
                    </Button>
                    <Button variant="danger" size="sm" className="flex-1 gap-2">
                      <Trash2 className="w-3 h-3" />
                      移除
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-secondary">
                沒有找到符合條件的卡片
              </div>
            )}
          </div>

          {/* Table Footer */}
          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{filteredCards.length} 筆，共 {filteredCards.length} 筆記錄
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader onClose={handleCancel}>
            <DialogTitle>編輯卡片</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  卡片 ID
                </label>
                <Input
                  value={editingCard?.card_id || ''}
                  disabled
                  className="font-mono bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  別名
                </label>
                <Input
                  value={formData.alias}
                  onChange={(e) => setFormData({ alias: e.target.value })}
                  placeholder="例如：學生證、悠遊卡、手錶"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  持有人
                </label>
                <Input
                  value={editingCard?.owner || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  狀態
                </label>
                <div className="flex gap-3">
                  <Button
                    variant={editingCard?.status === 'active' ? 'success' : 'secondary'}
                    onClick={() => editingCard && handleToggleStatus(editingCard.id)}
                    className="flex-1"
                  >
                    {editingCard?.status === 'active' ? '✓ 啟用' : '啟用'}
                  </Button>
                  <Button
                    variant={editingCard?.status === 'inactive' ? 'danger' : 'secondary'}
                    onClick={() => editingCard && handleToggleStatus(editingCard.id)}
                    className="flex-1"
                  >
                    {editingCard?.status === 'inactive' ? '✓ 停用' : '停用'}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>提示：</strong>卡片 ID 和持有人無法修改。如需變更請移除此卡片後重新綁定。
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
