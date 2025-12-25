import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
