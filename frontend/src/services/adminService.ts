import api from './api'
import type { Admin, AccessLog } from '../types'

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
}
