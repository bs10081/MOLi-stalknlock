import React from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  showHeader?: boolean
  showFooter?: boolean
  className?: string
  contentClassName?: string
  align?: 'center' | 'top'
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  showHeader = true,
  showFooter = true,
  className,
  contentClassName,
  align = 'top',
}) => {
  return (
    <div className={cn('min-h-screen flex flex-col bg-bg-primary text-text-primary', className)}>
      {showHeader && <Header />}
      <main
        className={cn(
          'relative flex-1 px-6 py-10 sm:px-8 lg:px-10',
          align === 'center' ? 'flex items-center justify-center' : '',
        )}
      >
        <div className={cn('mx-auto w-full max-w-7xl', contentClassName)}>
          {children}
        </div>
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
