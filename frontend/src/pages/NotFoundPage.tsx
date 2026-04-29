import React from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
    <Card variant="hero" className="w-full max-w-2xl">
      <CardHeader className="items-center text-center">
        <Badge variant="info">404</Badge>
        <CardTitle className="text-3xl font-semibold">{title}</CardTitle>
        <CardDescription className="max-w-xl text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={primaryHref}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-xl border border-primary bg-primary px-4 text-base font-medium text-white transition-colors hover:bg-primary/92',
            )}
          >
            {primaryLabel}
          </Link>
          <Link
            to={secondaryHref}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-xl border border-border/70 bg-white/80 px-4 text-base font-medium text-text-primary transition-colors hover:bg-muted/60',
            )}
          >
            {secondaryLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  )

  if (embedded) {
    return <div className="flex min-h-[50vh] items-center justify-center px-4">{content}</div>
  }

  return <PageWrapper>{content}</PageWrapper>
}
