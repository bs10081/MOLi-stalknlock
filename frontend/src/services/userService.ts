import api from './api'
import type { User, Card } from '../types'

export const userService = {
  getUsers: async () => {
    const response = await api.get<User[]>('/admin/users')
    return response.data
  },

  createUser: async (studentId: string, name: string, email?: string, telegramId?: string) => {
    const formData = new FormData()
    formData.append('student_id', studentId)
    formData.append('name', name)
    if (email !== undefined) formData.append('email', email || '')
    if (telegramId !== undefined) formData.append('telegram_id', telegramId || '')
    return api.post('/admin/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  updateUser: async (id: string, student_id: string, name: string, email?: string, telegram_id?: string, is_active?: boolean) => {
    const formData = new FormData()
    formData.append('student_id', student_id)
    formData.append('name', name)
    if (email !== undefined) formData.append('email', email || '')
    if (telegram_id !== undefined) formData.append('telegram_id', telegram_id || '')
    if (is_active !== undefined) formData.append('is_active', is_active.toString())

    console.log('🐛 DEBUG userService.updateUser: is_active =', is_active, 'toString =', is_active?.toString())
    console.log('🐛 DEBUG FormData entries:')
    for (let pair of formData.entries()) {
      console.log('  ', pair[0], '=', pair[1])
    }

    return api.put(`/admin/users/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  deleteUser: async (id: string) => {
    return api.delete(`/admin/users/${id}`)
  },

  bulkDeleteUsers: async (ids: string[]) => {
    const formData = new FormData()
    ids.forEach(id => formData.append('user_ids', id))
    return api.delete('/admin/users/bulk', {
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getUserCards: async (id: string) => {
    const response = await api.get<Card[]>(`/admin/users/${id}/cards`)
    return response.data
  },

  getAllCards: async () => {
    const response = await api.get<Card[]>('/admin/cards')
    return response.data
  },

  updateCard: async (id: string, nickname?: string, is_active?: boolean) => {
    const formData = new FormData()
    if (nickname !== undefined) formData.append('nickname', nickname)
    if (is_active !== undefined) formData.append('is_active', is_active.toString())
    return api.put(`/admin/cards/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  deleteCard: async (cardId: string) => {
    return api.delete(`/admin/cards/${cardId}`)
  },

  bulkDeleteCards: async (ids: string[]) => {
    const formData = new FormData()
    ids.forEach(id => formData.append('card_ids', id))
    return api.delete('/admin/cards/bulk', {
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  createCard: async (userId: string, rfidUid: string, nickname?: string) => {
    const formData = new FormData()
    formData.append('user_id', userId)
    formData.append('rfid_uid', rfidUid)
    if (nickname) formData.append('nickname', nickname)
    return api.post('/admin/cards', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  startCardBinding: async (userId: string) => {
    const formData = new FormData()
    formData.append('user_id', userId)
    return api.post('/admin/cards/bind', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 新增：啟動卡片綁定模式（使用 /mode/register 端點，支援卡片別名）
  startCardBindingWithNickname: async (studentId: string, nickname?: string) => {
    const params = new URLSearchParams()
    params.append('student_id', studentId)
    if (nickname) params.append('nickname', nickname)
    return api.post('/mode/register', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  },
}
