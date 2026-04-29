import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  eyebrow?: string
  meta?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  eyebrow,
  meta,
  className,
}) => {
  return (
    <header className={cn('mb-8 border-b border-border/60 pb-6', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          {eyebrow && (
            <span className="inline-flex rounded-full border border-border/80 bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-primary">
              {eyebrow}
            </span>
          )}
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-text-primary sm:text-[2.25rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
                {description}
              </p>
            )}
          </div>
          {meta && <div>{meta}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
