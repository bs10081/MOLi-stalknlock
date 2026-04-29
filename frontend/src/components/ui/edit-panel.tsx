import React from 'react'
import { Button } from './button'
import { Trash2 } from 'lucide-react'

interface EditPanelProps {
  children: React.ReactNode
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  saveDisabled?: boolean
  saving?: boolean
  deleting?: boolean
  className?: string
}

export const EditPanel: React.FC<EditPanelProps> = ({
  children,
  onSave,
  onCancel,
  onDelete,
  saveDisabled = false,
  saving = false,
  deleting = false,
  className = '',
}) => {
  return (
    <div className={`border-t border-border/60 bg-muted/48 ${className}`}>
      <div className="px-6 py-5">
        {/* 表單欄位區域 */}
        <div className="mb-5">
          {children}
        </div>

        {/* 底部操作區 */}
        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {/* 左側：刪除按鈕 */}
          <div>
            {onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={saving || deleting}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? '刪除中...' : '刪除'}
              </Button>
            )}
          </div>

          {/* 右側：取消 + 儲存按鈕 */}
          <div className="flex items-center gap-3 self-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving || deleting}
            >
              取消
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || deleting || saveDisabled}
            >
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
