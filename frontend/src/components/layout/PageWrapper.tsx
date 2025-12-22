import React from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface PageWrapperProps {
  children: React.ReactNode
  showHeader?: boolean
  showFooter?: boolean
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  showHeader = true,
  showFooter = true,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {showHeader && <Header />}
      <main className="flex-1 flex items-center justify-center p-8">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
