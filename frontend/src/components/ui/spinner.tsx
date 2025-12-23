import React from 'react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4',
  }

  return (
    <div
      className={cn(
        'inline-block rounded-full border-solid border-border border-t-accent animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="載入中"
    />
  )
}

Spinner.displayName = 'Spinner'

export { Spinner }
