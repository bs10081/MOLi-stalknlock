import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'info' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'border border-text-primary/10 bg-text-primary/[0.06] text-text-primary',
      outline: 'border border-border/80 bg-white text-text-primary',
      secondary: 'border border-border/70 bg-muted/70 text-text-secondary',
      destructive: 'border border-destructive/12 bg-destructive/[0.08] text-destructive',
      info: 'border border-accent/12 bg-accent/[0.08] text-accent',
      success: 'border border-emerald-500/14 bg-emerald-500/[0.08] text-emerald-700',
      warning: 'border border-amber-500/18 bg-amber-500/[0.12] text-amber-800',
      error: 'border border-red-500/14 bg-red-500/[0.08] text-red-700'
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-[11px]',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm'
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-semibold tracking-[0.01em]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
