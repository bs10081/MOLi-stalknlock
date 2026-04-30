import api from './api'
import type { Admin, AccessLog, DoorAccessMode, DoorEvent, DoorStatus } from '../types'

export interface Stats {
  user_count: number
  card_count: number
  admin_count: number
  log_count: number
  monthly_access_count: number
  active_users_count: number
}

export const adminService = {
  getAdmins: async () => {
    const response = await api.get<Admin[]>('/admin/admins')
    return response.data
  },

  createAdmin: async (username: string, password: string, name: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('name', name)
    return api.post('/admin/admins', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  deleteAdmin: async (id: string) => {
    return api.delete(`/admin/admins/${id}`)
  },

  updateAdmin: async (id: string, name?: string, password?: string) => {
    const formData = new FormData()
    if (name !== undefined) formData.append('name', name)
    if (password !== undefined) formData.append('password', password)
    return api.put(`/admin/admins/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getLogs: async (limit = 50) => {
    const response = await api.get<AccessLog[]>('/admin/logs', {
      params: { limit },
    })
    return response.data
  },

  unlockDoor: async () => {
    return api.post('/admin/door/unlock')
  },

  updateDoorSettings: async (
    accessMode: DoorAccessMode,
    dailyLockTime?: string,
    firstUnlockTime?: string,
    applyTiming: 'immediate' | 'next_cycle' = 'immediate',
  ) => {
    const formData = new FormData()
    formData.append('access_mode', accessMode)
    if (dailyLockTime !== undefined) formData.append('daily_lock_time', dailyLockTime)
    if (firstUnlockTime !== undefined) formData.append('first_unlock_time', firstUnlockTime)
    formData.append('apply_timing', applyTiming)
    return api.put('/admin/door/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getDoorStatus: async () => {
    const response = await api.get<DoorStatus>('/admin/door/status')
    return response.data
  },

  getDoorEvents: async (limit = 20) => {
    const response = await api.get<DoorEvent[]>('/admin/door/events', {
      params: { limit },
    })
    return response.data
  },

  simulateDoorScan: async (cardUid: string) => {
    const formData = new FormData()
    formData.append('card_uid', cardUid)
    return api.post('/admin/door/simulate-scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getStats: async () => {
    const response = await api.get<Stats>('/admin/stats')
    return response.data
  },
}
