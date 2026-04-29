import api from './api'
import type { VersionInfo } from '@/types'

export const versionService = {
  getVersion: async () => {
    const response = await api.get<VersionInfo>('/api/version')
    return response.data
  },
}
