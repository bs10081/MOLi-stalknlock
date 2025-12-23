import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
  onClose?: () => void
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, onClose }) => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>
      )}
    </div>
  )
}

interface DialogTitleProps {
  children: React.ReactNode
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children }) => {
  return <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
}

interface DialogDescriptionProps {
  children: React.ReactNode
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children }) => {
  return <p className="text-sm text-text-secondary mt-1">{children}</p>
}

interface DialogBodyProps {
  children: React.ReactNode
}

export const DialogBody: React.FC<DialogBodyProps> = ({ children }) => {
  return <div className="p-6">{children}</div>
}

interface DialogFooterProps {
  children: React.ReactNode
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
      {children}
    </div>
  )
}
