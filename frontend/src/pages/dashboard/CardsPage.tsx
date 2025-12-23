import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card as UICard, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Trash2, X, Edit, CreditCard, QrCode } from 'lucide-react'
import { userService } from '@/services/userService'
import type { Card, User } from '@/types'

interface CardWithUser extends Card {
  user?: User
}

export const CardsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState<CardWithUser[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCard, setEditingCard] = useState<CardWithUser | null>(null)
  const [formData, setFormData] = useState({ alias: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addFormData, setAddFormData] = useState({
    userId: '',
    rfidUid: '',
    nickname: '',
  })

  const userIdFilter = searchParams.get('user')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [cardsData, usersData] = await Promise.all([
        userService.getAllCards(),
        userService.getUsers()
      ])
      
      const cardsWithUsers = cardsData.map(card => ({
        ...card,
        user: usersData.find(u => u.id === card.user_id)
      }))
      
      setCards(cardsWithUsers)
      setUsers(usersData)
    } catch (err: any) {
      console.error('Failed to load data:', err)
      setError(err.response?.data?.detail || '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredCards = useMemo(() => {
    let filteredList = cards

    if (userIdFilter) {
      filteredList = filteredList.filter(card => card.user_id === userIdFilter)
    }

    if (searchTerm) {
      filteredList = filteredList.filter(card =>
        card.rfid_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.nickname && card.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (card.user && card.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filteredList
  }, [cards, userIdFilter, searchTerm])

  const clearFilter = () => {
    navigate('/dashboard/cards')
  }

  const handleEdit = (card: CardWithUser) => {
    setEditingCard(card)
    setFormData({ alias: card.nickname || '', is_active: card.is_active })
  }

  const handleSave = async () => {
    if (!editingCard) return

    try {
      setSaving(true)
      await userService.updateCard(editingCard.id, formData.alias, formData.is_active)
      await loadData()
      setEditingCard(null)
    } catch (err: any) {
      console.error('Failed to update card:', err)
      alert(err.response?.data?.detail || '更新卡片失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('確定要移除此卡片嗎？')) return

    try {
      await userService.deleteCard(cardId)
      await loadData()
    } catch (err: any) {
      console.error('Failed to delete card:', err)
      alert(err.response?.data?.detail || '刪除卡片失敗')
    }
  }

  const handleCancel = () => {
    setEditingCard(null)
  }

  const handleAdd = () => {
    setIsAddDialogOpen(true)
    setAddFormData({
      userId: userIdFilter || '',
      rfidUid: '',
      nickname: '',
    })
  }

  const handleAddCard = async () => {
    if (!addFormData.userId || !addFormData.rfidUid) {
      alert('請選擇使用者並輸入卡片 ID')
      return
    }

    try {
      setSaving(true)
      await userService.createCard(
        addFormData.userId,
        addFormData.rfidUid,
        addFormData.nickname || undefined
      )
      await loadData()
      setIsAddDialogOpen(false)
      setAddFormData({ userId: '', rfidUid: '', nickname: '' })
      alert('卡片新增成功')
    } catch (err: any) {
      console.error('Failed to create card:', err)
      alert(err.response?.data?.detail || '新增卡片失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleStartBinding = async () => {
    if (!addFormData.userId) {
      alert('請選擇使用者')
      return
    }

    try {
      setSaving(true)
      await userService.startCardBinding(addFormData.userId)
      setIsAddDialogOpen(false)
      // 導向到綁定頁面
      navigate(`/dashboard/register?user=${addFormData.userId}`)
    } catch (err: any) {
      console.error('Failed to start card binding:', err)
      alert(err.response?.data?.detail || '啟動綁定模式失敗')
      setSaving(false)
    }
  }

  const filteredUserName = userIdFilter
    ? users.find(user => user.id === userIdFilter)?.name
    : null

  if (loading) {
    return (
      <div>
        <PageHeader
          title="卡片管理"
          description="管理所有 RFID 卡片"
        />
        <UICard>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-text-secondary">
              載入中...
            </div>
          </CardContent>
        </UICard>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="卡片管理"
          description="管理所有 RFID 卡片"
        />
        <UICard>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadData}>重試</Button>
            </div>
          </CardContent>
        </UICard>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="卡片管理"
        description="管理所有 RFID 卡片"
        actions={
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            新增卡片
          </Button>
        }
      />

      <UICard>
        <CardContent className="pt-6">
          {userIdFilter && filteredUserName && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-900">
                <strong>篩選條件：</strong>顯示使用者「{filteredUserName}」的卡片
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFilter}
                className="ml-auto gap-2 text-blue-900 hover:text-blue-700 hover:bg-blue-100"
              >
                <X className="w-4 h-4" />
                清除篩選
              </Button>
            </div>
          )}

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

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>卡片 ID</TableHead>
                  <TableHead>別名</TableHead>
                  <TableHead>持有人</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="hidden lg:table-cell">建立日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.length > 0 ? (
                  filteredCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium font-mono">
                        {card.rfid_uid.slice(-8)}
                      </TableCell>
                      <TableCell>{card.nickname || '-'}</TableCell>
                      <TableCell>{card.user?.name || '未知'}</TableCell>
                      <TableCell>
                        <Badge variant={card.is_active ? 'success' : 'secondary'} size="sm">
                          {card.is_active ? '啟用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-text-secondary">
                        {new Date(card.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 whitespace-nowrap"
                            onClick={() => handleEdit(card)}
                          >
                            <Edit className="w-3 h-3" />
                            <span className="hidden lg:inline">編輯</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="gap-2 whitespace-nowrap"
                            onClick={() => handleDelete(card.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden lg:inline">移除</span>
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

          <div className="md:hidden space-y-3">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <div key={card.id} className="bg-bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-text-secondary flex-shrink-0" />
                        <h3 className="font-semibold font-mono text-text-primary text-sm">
                          {card.rfid_uid.slice(-8)}
                        </h3>
                      </div>
                      <p className="text-sm text-text-secondary mt-1 truncate">
                        {card.nickname || '無別名'}
                      </p>
                    </div>
                    <Badge variant={card.is_active ? 'success' : 'secondary'} size="sm" className="ml-2 flex-shrink-0">
                      {card.is_active ? '啟用' : '停用'}
                    </Badge>
                  </div>

                  <div className="text-sm text-text-secondary mb-3">
                    持有人：<span className="font-medium text-text-primary">{card.user?.name || '未知'}</span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleEdit(card)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      編輯
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleDelete(card.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{filteredCards.length} 筆，共 {filteredCards.length} 筆記錄
          </div>
        </CardContent>
      </UICard>

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
                  value={editingCard?.rfid_uid.slice(-8) || ''}
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
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="例如：學生證、悠遊卡、手錶"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  持有人
                </label>
                <Input
                  value={editingCard?.user?.name || '未知'}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 border border-border rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    卡片狀態
                  </label>
                  <p className="text-xs text-text-secondary">
                    {formData.is_active ? '已啟用：此卡片可以正常使用' : '已停用：此卡片無法使用'}
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
                  <strong>提示：</strong>卡片 ID 和持有人無法修改。如需變更請移除此卡片後重新綁定。
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
            <DialogTitle>新增卡片</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  選擇使用者 <span className="text-red-500">*</span>
                </label>
                <select
                  value={addFormData.userId}
                  onChange={(e) => setAddFormData({ ...addFormData, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">請選擇使用者</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <h3 className="font-medium text-text-primary">方式一：手動輸入卡片 ID</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    卡片 ID (RFID UID)
                  </label>
                  <Input
                    value={addFormData.rfidUid}
                    onChange={(e) => setAddFormData({ ...addFormData, rfidUid: e.target.value })}
                    placeholder="例如：0546679458"
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    別名（可選）
                  </label>
                  <Input
                    value={addFormData.nickname}
                    onChange={(e) => setAddFormData({ ...addFormData, nickname: e.target.value })}
                    placeholder="例如：學生證、悠遊卡"
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleAddCard}
                  disabled={saving || !addFormData.userId || !addFormData.rfidUid}
                >
                  <Plus className="w-4 h-4" />
                  {saving ? '新增中...' : '新增卡片'}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-text-secondary">或</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">方式二：啟動刷卡綁定</h3>
                </div>

                <p className="text-sm text-blue-800">
                  系統將啟動 90 秒倒計時，請在時間內刷卡兩次完成綁定。
                </p>

                <Button
                  variant="secondary"
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleStartBinding}
                  disabled={saving || !addFormData.userId}
                >
                  <QrCode className="w-4 h-4" />
                  啟動刷卡綁定模式
                </Button>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddDialogOpen(false)} disabled={saving}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
