import React from 'react'
import { Button } from './button'
import { X, Trash2 } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkDelete: () => void
  deleting?: boolean
  className?: string
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  deleting = false,
  className = '',
}) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between ${className}`}>
      {/* 左側：顯示選擇數量 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-blue-900">
          已選擇 {selectedCount} 項
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClearSelection}
          disabled={deleting}
          className="gap-1.5 text-blue-900 hover:text-blue-700 hover:bg-blue-100 border-blue-300"
        >
          <X className="w-3.5 h-3.5" />
          取消選擇
        </Button>
      </div>

      {/* 右側：批量操作按鈕 */}
      <div>
        <Button
          variant="danger"
          onClick={onBulkDelete}
          disabled={deleting}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? '刪除中...' : '批量刪除'}
        </Button>
      </div>
    </div>
  )
}
