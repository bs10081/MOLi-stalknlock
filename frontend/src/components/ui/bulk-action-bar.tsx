import React from 'react'
import { Button } from './button'
import { Trash2, Edit2, Ban, CheckCircle } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  totalCount?: number
  onClearSelection: () => void
  onBulkDelete: () => void
  onBulkEdit?: () => void
  onBulkDisable?: () => void
  onBulkEnable?: () => void
  deleting?: boolean
  className?: string
  itemType?: 'users' | 'cards'
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkDelete,
  onBulkEdit,
  onBulkDisable,
  onBulkEnable,
  deleting = false,
  className = '',
  itemType = 'users',
}) => {
  const itemLabel = itemType === 'users' ? '位使用者' : '張卡片'

  return (
    <div className={`flex flex-col gap-4 rounded-[24px] border border-border/60 bg-muted/52 px-4 py-4 lg:flex-row lg:items-center lg:justify-between ${className}`}>
      {/* 左側：顯示選擇數量 + Clear selection 連結 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-text-primary">
          {totalCount ? `${selectedCount} of ${totalCount} selected` : `已選擇 ${selectedCount} 項`}
        </span>
        <button
          onClick={onClearSelection}
          disabled={deleting}
          className="text-sm text-primary hover:text-primary/80 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear selection
        </button>
      </div>

      {/* 右側：批量操作按鈕 */}
      <div className="flex flex-wrap items-center gap-3">
        {onBulkEnable && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkEnable}
            disabled={deleting}
            className="gap-2 text-emerald-700"
          >
            <CheckCircle className="w-4 h-4" />
            啟用 {selectedCount} {itemLabel}
          </Button>
        )}

        {onBulkDisable && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDisable}
            disabled={deleting}
            className="gap-2 text-text-secondary"
          >
            <Ban className="w-4 h-4" />
            停用 {selectedCount} {itemLabel}
          </Button>
        )}

        {onBulkEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkEdit}
            disabled={deleting}
            className="gap-2 text-primary"
          >
            <Edit2 className="w-4 h-4" />
            編輯 {selectedCount} {itemLabel}
          </Button>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          disabled={deleting}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          刪除 {selectedCount} {itemLabel}
        </Button>
      </div>
    </div>
  )
}
