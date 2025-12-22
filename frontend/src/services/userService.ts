import api from './api'
import type { User, Card } from '../types'

export const userService = {
  getUsers: async () => {
    const response = await api.get<User[]>('/admin/users')
    return response.data
  },

  updateUser: async (id: string, student_id: string, name: string) => {
    const formData = new FormData()
    formData.append('student_id', student_id)
    formData.append('name', name)
    return api.put(`/admin/users/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  deleteUser: async (id: string) => {
    return api.delete(`/admin/users/${id}`)
  },

  getUserCards: async (id: string) => {
    const response = await api.get<Card[]>(`/admin/users/${id}/cards`)
    return response.data
  },

  deleteCard: async (cardId: string) => {
    return api.delete(`/admin/cards/${cardId}`)
  },
}
