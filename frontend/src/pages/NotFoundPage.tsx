import React from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface NotFoundPageProps {
  title?: string
  description?: string
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  embedded?: boolean
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title = '找不到這個頁面',
  description = '你開啟的路徑不存在，請回到首頁或重新確認網址。',
  primaryHref = '/',
  primaryLabel = '回到首頁',
  secondaryHref = '/login',
  secondaryLabel = '前往登入',
  embedded = false,
}) => {
  const content = (
    <Card className="w-full max-w-xl">
      <CardHeader className="text-center">
        <p className="text-sm font-medium text-accent">404</p>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <p className="text-sm text-text-secondary">{description}</p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to={primaryHref}
            className={cn(
              'inline-flex items-center justify-center rounded-md font-medium transition-colors',
              'h-10 px-4 text-base bg-accent text-white hover:bg-[#1d4ed8]'
            )}
          >
            {primaryLabel}
          </Link>
          <Link
            to={secondaryHref}
            className={cn(
              'inline-flex items-center justify-center rounded-md font-medium transition-colors',
              'h-10 px-4 text-base bg-bg-primary text-text-primary border border-border hover:bg-gray-100'
            )}
          >
            {secondaryLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  )

  if (embedded) {
    return <div className="flex items-center justify-center min-h-[50vh] px-4">{content}</div>
  }

  return (
    <PageWrapper showHeader={false} showFooter={false}>
      {content}
    </PageWrapper>
  )
}
