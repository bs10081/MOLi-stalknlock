import React from 'react'
import { Link } from 'react-router-dom'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatVersionLabel } from '@/lib/version'

export const Header: React.FC = () => {
  const { versionInfo } = useAppVersion()

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-white/96 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-text-primary text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(17,17,17,0.38)]">
            M
          </span>
          <div>
            <p className="font-heading text-sm font-semibold tracking-[0.02em] text-text-primary">Makers' Open Lab for Innovation</p>
            <p className="text-xs text-text-secondary">Door Access System</p>
          </div>
        </Link>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Door Access System
          </span>
          <span className="text-xs text-text-secondary">{formatVersionLabel(versionInfo)}</span>
        </div>
      </div>
    </header>
  )
}
