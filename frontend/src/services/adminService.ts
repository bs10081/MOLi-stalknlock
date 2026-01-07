import api from './api'
import type { Admin, AccessLog, DoorStatus, LockMode, AdminCard } from '../types'

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
    if (name) formData.append('name', name)
    if (password) formData.append('password', password)
    return api.put(`/admin/admins/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getLogs: async () => {
    const response = await api.get<AccessLog[]>('/admin/logs')
    return response.data
  },

  unlockDoor: async () => {
    return api.post('/admin/door/unlock')
  },

  getStats: async () => {
    const response = await api.get<Stats>('/admin/stats')
    return response.data
  },

  // === 門鎖狀態與控制 ===

  getDoorStatus: async () => {
    const response = await api.get<DoorStatus>('/admin/door/status')
    return response.data
  },

  forceLockDoor: async () => {
    return api.post('/admin/door/lock')
  },

  // === 鎖門模式 API ===

  getLockMode: async () => {
    const response = await api.get<LockMode>('/admin/door/lock-mode')
    return response.data
  },

  setLockMode: async (always_lock: boolean, force: boolean = false) => {
    const formData = new FormData()
    formData.append('always_lock', always_lock.toString())
    formData.append('force', force.toString())
    return api.post('/admin/door/lock-mode', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // === 管理卡 API ===

  getAdminCards: async () => {
    const response = await api.get<AdminCard[]>('/admin/admin-cards')
    return response.data
  },

  createAdminCard: async (rfid_uid: string, nickname?: string, user_id?: string) => {
    const formData = new FormData()
    formData.append('rfid_uid', rfid_uid)
    if (nickname) formData.append('nickname', nickname)
    if (user_id) formData.append('user_id', user_id)
    return api.post('/admin/admin-cards', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  deleteAdminCard: async (card_id: string) => {
    return api.delete(`/admin/admin-cards/${card_id}`)
  },
}
