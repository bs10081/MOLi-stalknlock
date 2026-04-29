import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

import type { VersionInfo } from '@/types'
import { versionService } from '@/services/versionService'

interface AppVersionContextValue {
  versionInfo: VersionInfo | null
  loading: boolean
  refresh: () => Promise<void>
}

const AppVersionContext = createContext<AppVersionContextValue | undefined>(undefined)

export const AppVersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadVersion = async () => {
    try {
      setLoading(true)
      const data = await versionService.getVersion()
      setVersionInfo(data)
    } catch (error) {
      console.error('Failed to load version info:', error)
      setVersionInfo(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVersion()
  }, [])

  const value = useMemo(
    () => ({
      versionInfo,
      loading,
      refresh: loadVersion,
    }),
    [versionInfo, loading],
  )

  return <AppVersionContext.Provider value={value}>{children}</AppVersionContext.Provider>
}

export function useAppVersion() {
  const context = useContext(AppVersionContext)
  if (!context) {
    throw new Error('useAppVersion must be used within AppVersionProvider')
  }
  return context
}
