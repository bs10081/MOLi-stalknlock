import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card as UICard, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EditPanel } from '@/components/ui/edit-panel'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, X, ChevronRight, CreditCard, QrCode, CheckCircle, Check } from 'lucide-react'
import { userService } from '@/services/userService'
import { registerService } from '@/services/registerService'
import type { Card, User } from '@/types'

interface CardWithUser extends Card {
  user?: User
}

interface FormDataType {
  nickname: string
  is_active: boolean
}

export const CardsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState<CardWithUser[]>([])
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

  // 新增卡片狀態
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [addFormData, setAddFormData] = useState({
    userId: '',
    rfidUid: '',
    nickname: '',
  })
  const [addSaving, setAddSaving] = useState(false)

  // ========== 綁定 Dialog 狀態 ==========
  const [isBindingDialogOpen, setIsBindingDialogOpen] = useState(false)
  const [bindingStatus, setBindingStatus] = useState<'idle' | 'binding' | 'success' | 'timeout' | 'error'>('idle')
  const [bindingStep, setBindingStep] = useState(0)
  const [bindingCountdown, setBindingCountdown] = useState(90)
  const [bindingMessage, setBindingMessage] = useState('')

  // Refs 管理定時器
  const pollIntervalRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  const userIdFilter = searchParams.get('user')

  useEffect(() => {
    loadData()
  }, [])

  // Cleanup: 元件卸載時清除定時器
  useEffect(() => {
    return () => clearBindingIntervals()
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

  // ========== 批量選擇邏輯 ==========
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredCards.map(c => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (cardId: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(cardId)
    } else {
      newSet.delete(cardId)
    }
    setSelectedIds(newSet)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (!confirm(`確定要刪除 ${selectedIds.size} 張卡片嗎？此操作無法復原。`)) return

    try {
      // TODO: 實作批量刪除 API
      for (const id of Array.from(selectedIds)) {
        await userService.deleteCard(id)
      }
      await loadData()
      setSelectedIds(new Set())
      alert('批量刪除成功')
    } catch (err: any) {
      console.error('Failed to bulk delete cards:', err)
      alert(err.response?.data?.detail || '批量刪除失敗')
    }
  }

  const handleBulkDisable = async () => {
    if (!confirm(`確定要停用 ${selectedIds.size} 張卡片嗎？`)) return

    try {
      for (const id of Array.from(selectedIds)) {
        await userService.updateCard(id, undefined, false) // 只更新 is_active，不傳遞 nickname
      }
      await loadData()
      setSelectedIds(new Set())
      alert('批量停用成功')
    } catch (err: any) {
      console.error('Failed to bulk disable cards:', err)
      const errorMessage = err.response?.data?.detail || err.message || '批量停用失敗'
      alert(typeof errorMessage === 'string' ? errorMessage : '批量停用失敗')
    }
  }

  const handleBulkEnable = async () => {
    if (!confirm(`確定要啟用 ${selectedIds.size} 張卡片嗎？`)) return

    try {
      for (const id of Array.from(selectedIds)) {
        await userService.updateCard(id, undefined, true) // 只更新 is_active 為 true
      }
      await loadData()
      setSelectedIds(new Set())
      alert('批量啟用成功')
    } catch (err: any) {
      console.error('Failed to bulk enable cards:', err)
      const errorMessage = err.response?.data?.detail || err.message || '批量啟用失敗'
      alert(typeof errorMessage === 'string' ? errorMessage : '批量啟用失敗')
    }
  }

  // ========== 行內編輯邏輯 ==========
  const handleEdit = (card: CardWithUser) => {
    const newExpandedIds = new Set(expandedIds)
    const newFormDataMap = new Map(editFormDataMap)

    if (newExpandedIds.has(card.id)) {
      // 如果已展開，則收合
      newExpandedIds.delete(card.id)
      newFormDataMap.delete(card.id)
    } else {
      // 展開並初始化表單資料
      newExpandedIds.add(card.id)
      newFormDataMap.set(card.id, {
        nickname: card.nickname || '',
        is_active: card.is_active,
      })
    }

    setExpandedIds(newExpandedIds)
    setEditFormDataMap(newFormDataMap)
  }

  const handleFormChange = (cardId: string, field: keyof FormDataType, value: string | boolean) => {
    const newFormDataMap = new Map(editFormDataMap)
    const formData = newFormDataMap.get(cardId)
    if (formData) {
      newFormDataMap.set(cardId, { ...formData, [field]: value })
      setEditFormDataMap(newFormDataMap)
    }
  }

  const handleSave = async (cardId: string) => {
    const formData = editFormDataMap.get(cardId)
    if (!formData) return

    try {
      setSavingIds(new Set(savingIds).add(cardId))
      await userService.updateCard(cardId, formData.nickname, formData.is_active)
      await loadData()

      // 收合編輯區
      const newExpandedIds = new Set(expandedIds)
      const newFormDataMap = new Map(editFormDataMap)
      newExpandedIds.delete(cardId)
      newFormDataMap.delete(cardId)
      setExpandedIds(newExpandedIds)
      setEditFormDataMap(newFormDataMap)
    } catch (err: any) {
      console.error('Failed to update card:', err)
      alert(err.response?.data?.detail || '更新卡片失敗')
    } finally {
      const newSavingIds = new Set(savingIds)
      newSavingIds.delete(cardId)
      setSavingIds(newSavingIds)
    }
  }

  const handleCancel = (cardId: string) => {
    const newExpandedIds = new Set(expandedIds)
    const newFormDataMap = new Map(editFormDataMap)
    newExpandedIds.delete(cardId)
    newFormDataMap.delete(cardId)
    setExpandedIds(newExpandedIds)
    setEditFormDataMap(newFormDataMap)
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('確定要移除此卡片嗎？')) return

    try {
      setDeletingIds(new Set(deletingIds).add(cardId))
      await userService.deleteCard(cardId)
      await loadData()

      // 收合編輯區
      const newExpandedIds = new Set(expandedIds)
      const newFormDataMap = new Map(editFormDataMap)
      newExpandedIds.delete(cardId)
      newFormDataMap.delete(cardId)
      setExpandedIds(newExpandedIds)
      setEditFormDataMap(newFormDataMap)
    } catch (err: any) {
      console.error('Failed to delete card:', err)
      alert(err.response?.data?.detail || '刪除卡片失敗')
    } finally {
      const newDeletingIds = new Set(deletingIds)
      newDeletingIds.delete(cardId)
      setDeletingIds(newDeletingIds)
    }
  }

  // ========== 新增卡片邏輯 ==========
  const handleAdd = () => {
    setIsAddFormOpen(true)
    setAddFormData({
      userId: userIdFilter || '',
      rfidUid: '',
      nickname: '',
    })
  }

  const handleCancelAdd = () => {
    setIsAddFormOpen(false)
    setAddFormData({
      userId: '',
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
      setAddSaving(true)
      await userService.createCard(
        addFormData.userId,
        addFormData.rfidUid,
        addFormData.nickname || undefined
      )
      await loadData()
      setIsAddFormOpen(false)
      setAddFormData({ userId: '', rfidUid: '', nickname: '' })
      alert('卡片新增成功')
    } catch (err: any) {
      console.error('Failed to create card:', err)
      alert(err.response?.data?.detail || '新增卡片失敗')
    } finally {
      setAddSaving(false)
    }
  }

  // ========== 綁定 Dialog 輔助函式 ==========
  // 清除定時器
  const clearBindingIntervals = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  // 啟動輪詢
  const startBindingPolling = (studentId: string) => {
    // 倒數計時
    countdownIntervalRef.current = window.setInterval(() => {
      setBindingCountdown((prev) => {
        if (prev <= 1) {
          clearBindingIntervals()
          setBindingStatus('timeout')
          setBindingMessage('刷卡逾時，請重新嘗試')
          return 0
        }
        return prev - 2
      })
    }, 2000)

    // 輪詢狀態
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const status = await registerService.checkStatus(studentId)
        if (status.step !== undefined) setBindingStep(status.step)
        if (status.status_message) setBindingMessage(status.status_message)

        // 完成判斷
        if (status.bound && (!status.binding_in_progress ||
            (status.initial_count !== undefined && status.card_count && status.card_count > status.initial_count))) {
          clearBindingIntervals()
          setBindingStep(2)
          setBindingStatus('success')
          setBindingMessage(`卡片綁定成功（共 ${status.card_count} 張卡片）`)
          await loadData()
        }
      } catch (err) {
        clearBindingIntervals()
        setBindingStatus('error')
        setBindingMessage('連線錯誤，請重新嘗試')
      }
    }, 2000)
  }

  // 取消綁定
  const handleCancelBinding = () => {
    clearBindingIntervals()
    setBindingStatus('idle')
    setIsBindingDialogOpen(false)
    setAddFormData({ userId: '', rfidUid: '', nickname: '' })
  }

  // Dialog 關閉處理
  const handleBindingDialogClose = (open: boolean) => {
    if (!open) {
      if (bindingStatus === 'binding' && !confirm('綁定進行中，確定要取消嗎？')) return
      clearBindingIntervals()
      setIsBindingDialogOpen(false)
      setBindingStatus('idle')
      setBindingStep(0)
      setBindingCountdown(90)
      setBindingMessage('')
      setAddFormData({ userId: '', rfidUid: '', nickname: '' })
    }
  }

  const handleStartBinding = async () => {
    if (!addFormData.userId) {
      alert('請選擇使用者')
      return
    }

    try {
      setAddSaving(true)

      // 取得 student_id
      const user = users.find(u => u.id === addFormData.userId)
      if (!user) throw new Error('找不到使用者資料')

      // 使用新的綁定方法，支援卡片別名
      await userService.startCardBindingWithNickname(user.student_id, addFormData.nickname || undefined)

      // 開啟 Dialog（不跳轉）
      setIsAddFormOpen(false)
      setIsBindingDialogOpen(true)
      setBindingStatus('binding')
      setBindingStep(0)
      setBindingCountdown(90)
      setBindingMessage('請在 90 秒內刷卡兩次...')

      // 啟動輪詢
      startBindingPolling(user.student_id)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const errorMessage = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join(', ')
          : '啟動綁定模式失敗'
      alert(errorMessage)
    } finally {
      setAddSaving(false)
    }
  }

  const clearFilter = () => {
    navigate('/dashboard/cards')
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

  // 計算全選狀態
  const allSelected = filteredCards.length > 0 && filteredCards.every(c => selectedIds.has(c.id))
  const someSelected = filteredCards.some(c => selectedIds.has(c.id)) && !allSelected

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
      />

      <UICard>
        <CardContent className="p-0">
          {userIdFilter && filteredUserName && (
            <div className="mx-6 mt-6 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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

          <div className={userIdFilter ? "p-6 pb-0 pt-4" : "p-6 pb-0"}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  placeholder="搜尋卡片 ID、別名或持有人..."
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
                新增卡片
              </Button>
            </div>
          </div>

          {/* 新增卡片展開式表單 */}
          {isAddFormOpen && (
            <div className="border-t border-b border-gray-200 bg-gray-50 px-6 py-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    選擇使用者 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.userId}
                    onChange={(e) => setAddFormData({ ...addFormData, userId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">請選擇使用者</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.student_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    卡片 ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addFormData.rfidUid}
                    onChange={(e) => setAddFormData({ ...addFormData, rfidUid: e.target.value })}
                    placeholder="請輸入卡片 ID"
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    別名
                  </label>
                  <Input
                    value={addFormData.nickname}
                    onChange={(e) => setAddFormData({ ...addFormData, nickname: e.target.value })}
                    placeholder="例如：學生證、悠遊卡"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={handleStartBinding}
                  disabled={addSaving}
                  className="gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  使用綁定模式
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleCancelAdd}
                    disabled={addSaving}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleAddCard}
                    disabled={addSaving}
                  >
                    {addSaving ? '新增中...' : '新增'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 批量操作欄 */}
          {selectedIds.size > 0 && (
            <div className="pt-4 pb-2">
              <BulkActionBar
                selectedCount={selectedIds.size}
                totalCount={filteredCards.length}
                onClearSelection={handleClearSelection}
                onBulkDelete={handleBulkDelete}
                onBulkDisable={handleBulkDisable}
                onBulkEnable={handleBulkEnable}
                itemType="cards"
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
                  filteredCards.map((card) => {
                    const isExpanded = expandedIds.has(card.id)
                    const formData = editFormDataMap.get(card.id)
                    const isSaving = savingIds.has(card.id)
                    const isDeleting = deletingIds.has(card.id)

                    return (
                      <React.Fragment key={card.id}>
                        <TableRow>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(card.id)}
                              onChange={(checked) => handleSelectOne(card.id, checked)}
                            />
                          </TableCell>
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
                            <button
                              onClick={() => handleEdit(card)}
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
                            <TableCell colSpan={7} className="p-0">
                              <EditPanel
                                onSave={() => handleSave(card.id)}
                                onCancel={() => handleCancel(card.id)}
                                onDelete={() => handleDelete(card.id)}
                                saving={isSaving}
                                deleting={isDeleting}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                      卡片 ID
                                    </label>
                                    <Input
                                      value={card.rfid_uid.slice(-8)}
                                      disabled
                                      className="font-mono bg-gray-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                      持有人
                                    </label>
                                    <Input
                                      value={card.user?.name || '未知'}
                                      disabled
                                      className="bg-gray-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                      別名
                                    </label>
                                    <Input
                                      value={formData.nickname}
                                      onChange={(e) => handleFormChange(card.id, 'nickname', e.target.value)}
                                      placeholder="例如：學生證、悠遊卡、手錶"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                      卡片狀態
                                    </label>
                                    <div className="flex items-center gap-3 h-10 px-3 bg-white border border-gray-200 rounded-lg">
                                      <span className="text-sm text-text-secondary flex-1">
                                        {formData.is_active ? '已啟用' : '已停用'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleFormChange(card.id, 'is_active', !formData.is_active)}
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
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-text-secondary">
                      沒有找到符合條件的卡片
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3 p-6 pt-0 mt-6">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => {
                const isExpanded = expandedIds.has(card.id)
                const formData = editFormDataMap.get(card.id)
                const isSaving = savingIds.has(card.id)
                const isDeleting = deletingIds.has(card.id)

                return (
                  <div key={card.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* 卡片標題區域 */}
                    <div className="p-4">
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

                      {/* Edit 連結 */}
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(card)}
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
                              卡片 ID
                            </label>
                            <Input
                              value={card.rfid_uid.slice(-8)}
                              disabled
                              className="font-mono bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                              持有人
                            </label>
                            <Input
                              value={card.user?.name || '未知'}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                              別名
                            </label>
                            <Input
                              value={formData.nickname}
                              onChange={(e) => handleFormChange(card.id, 'nickname', e.target.value)}
                              placeholder="例如：學生證、悠遊卡"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                              卡片狀態
                            </label>
                            <div className="flex items-center gap-3 h-10 px-3 bg-white border border-gray-200 rounded-lg">
                              <span className="text-sm text-text-secondary flex-1">
                                {formData.is_active ? '已啟用' : '已停用'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleFormChange(card.id, 'is_active', !formData.is_active)}
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
                                onClick={() => handleCancel(card.id)}
                                disabled={isSaving || isDeleting}
                                className="flex-1"
                              >
                                取消
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(card.id)}
                                disabled={isSaving || isDeleting}
                                className="flex-1"
                              >
                                {isSaving ? '儲存中...' : '儲存'}
                              </Button>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(card.id)}
                              disabled={isSaving || isDeleting}
                              className="w-full"
                            >
                              {isDeleting ? '刪除中...' : '移除卡片'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-text-secondary">
                沒有找到符合條件的卡片
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-4 text-sm text-text-secondary border-t border-border">
            顯示 1-{filteredCards.length} 筆，共 {filteredCards.length} 筆記錄
          </div>
        </CardContent>
      </UICard>

      {/* 綁定模式 Dialog */}
      <Dialog open={isBindingDialogOpen} onOpenChange={handleBindingDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bindingStatus === 'success' ? '綁定完成' :
               bindingStatus === 'timeout' ? '綁定逾時' :
               bindingStatus === 'error' ? '綁定失敗' : '卡片綁定'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="flex flex-col items-center space-y-8 py-6">
              {/* 步驟指示器 */}
              {bindingStatus === 'binding' && (
                <div className="flex items-center w-full max-w-xs">
                  {/* 步驟 1 */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-base font-medium border-2 transition-all mb-2",
                      bindingStep >= 1
                        ? "bg-success text-white border-success"
                        : bindingStep === 0
                          ? "bg-accent text-white border-accent"
                          : "bg-white text-text-secondary border-border"
                    )}>
                      {bindingStep >= 1 ? <Check className="w-5 h-5" /> : "1"}
                    </div>
                    <span className="text-sm text-text-secondary">刷卡 1</span>
                  </div>

                  {/* 連接線 */}
                  <div className={cn(
                    "flex-1 h-1 rounded-full mx-4 mb-7",
                    bindingStep >= 1 ? "bg-success" : "bg-border"
                  )} />

                  {/* 步驟 2 */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-base font-medium border-2 transition-all mb-2",
                      bindingStep >= 2
                        ? "bg-success text-white border-success"
                        : bindingStep === 1
                          ? "bg-accent text-white border-accent"
                          : "bg-white text-text-secondary border-border"
                    )}>
                      {bindingStep >= 2 ? <Check className="w-5 h-5" /> : "2"}
                    </div>
                    <span className="text-sm text-text-secondary">刷卡 2</span>
                  </div>
                </div>
              )}

              {/* 狀態訊息 */}
              {bindingStatus === 'binding' && (
                <p className="text-sm text-text-secondary">
                  請將卡片靠近讀卡機
                </p>
              )}

              {bindingStatus === 'success' && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">綁定成功</span>
                </div>
              )}

              {bindingStatus === 'timeout' && (
                <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-yellow-800 text-sm">綁定超時，請重試</p>
                </div>
              )}

              {bindingStatus === 'error' && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-red-800 text-sm">{bindingMessage}</p>
                </div>
              )}

              {/* 倒數計時 */}
              {bindingStatus === 'binding' && bindingCountdown > 0 && (
                <div className="text-3xl font-mono font-bold text-text-primary tracking-wider">
                  {String(Math.floor(bindingCountdown / 60)).padStart(2, '0')}:
                  {String(bindingCountdown % 60).padStart(2, '0')}
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            {bindingStatus === 'binding' ? (
              <Button variant="secondary" onClick={handleCancelBinding}>取消綁定</Button>
            ) : (
              <Button onClick={() => handleBindingDialogClose(false)}>
                {bindingStatus === 'success' ? '完成' : '關閉'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
