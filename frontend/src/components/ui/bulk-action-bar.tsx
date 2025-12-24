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
    <div className={`py-3 flex items-center justify-between ${className}`}>
      {/* 左側：顯示選擇數量 + Clear selection 連結 */}
      <div className="flex items-center gap-3 pl-4">
        <span className="text-sm font-medium text-gray-700">
          {totalCount ? `${selectedCount} of ${totalCount} selected` : `已選擇 ${selectedCount} 項`}
        </span>
        <button
          onClick={onClearSelection}
          disabled={deleting}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear selection
        </button>
      </div>

      {/* 右側：批量操作按鈕 */}
      <div className="flex items-center gap-3 pr-4">
        {onBulkEnable && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkEnable}
            disabled={deleting}
            className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
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
            className="gap-2 border-gray-400 text-gray-600 hover:bg-gray-50"
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
            className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Edit2 className="w-4 h-4" />
            編輯 {selectedCount} {itemLabel}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDelete}
          disabled={deleting}
          className="gap-2 border-red-500 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          刪除 {selectedCount} {itemLabel}
        </Button>
      </div>
    </div>
  )
}
