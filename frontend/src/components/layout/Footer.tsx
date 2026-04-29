import React from 'react'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatBuiltAt, formatVersionLabel } from '@/lib/version'

export const Footer: React.FC = () => {
  const { versionInfo } = useAppVersion()
  const builtAt = formatBuiltAt(versionInfo?.built_at)

  return (
    <footer className="border-t border-border/60 bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-4 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
          <span>© Makers' Open Lab for Innovation</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-1 font-medium text-text-primary">
            {formatVersionLabel(versionInfo)}
          </span>
          {builtAt && <span>Built {builtAt}</span>}
        </div>
      </div>
    </footer>
  )
}
