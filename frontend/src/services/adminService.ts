import api from './api'
import type { Admin, AccessLog } from '../types'

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

  getLogs: async () => {
    const response = await api.get<AccessLog[]>('/admin/logs')
    return response.data
  },

  unlockDoor: async () => {
    return api.post('/admin/door/unlock')
  },
}
